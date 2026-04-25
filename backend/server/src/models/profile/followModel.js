const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const {
  incrementFollowers,
  decrementFollowers,
  incrementFollowing,
  decrementFollowing,
} = require("./profileModel");

const COLLECTION_NAME = "follows";
const PROFILES_COLLECTION = "profiles";

const assertValidObjectId = (id, fieldName) => {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

const normalizeFollowIds = (followerId, followingId) => {
  assertValidObjectId(followerId, "follower id");
  assertValidObjectId(followingId, "following id");

  const followerObjectId = new ObjectId(followerId);
  const followingObjectId = new ObjectId(followingId);

  if (followerObjectId.equals(followingObjectId)) {
    throw new Error("You cannot follow yourself");
  }

  return { followerObjectId, followingObjectId };
};

const isDuplicateFollowError = (error) => error?.code === 11000;

const isTransactionUnsupportedError = (error) =>
  /Transaction numbers are only allowed on a replica set member or mongos|Transaction not supported|does not support transactions|replica set/i.test(
    error?.message || "",
  );

const assertProfilesExist = async (
  db,
  followerObjectId,
  followingObjectId,
  session,
) => {
  const profilesCollection = db.collection(PROFILES_COLLECTION);

  const followerProfile = await profilesCollection.findOne(
    { userId: followerObjectId, deletedAt: null },
    { projection: { _id: 1 }, session },
  );

  const followingProfile = await profilesCollection.findOne(
    { userId: followingObjectId, deletedAt: null },
    { projection: { _id: 1 }, session },
  );

  if (!followerProfile) {
    throw new Error("Follower profile not found");
  }

  if (!followingProfile) {
    throw new Error("Following profile not found");
  }
};

const followUser = async (followerId, followingId) => {
  const db = await connectToDatabase();
  const { followerObjectId, followingObjectId } = normalizeFollowIds(
    followerId,
    followingId,
  );
  const client = getClient();
  let session;

  try {
    session = client.startSession();

    await session.withTransaction(async () => {
      const followsCollection = db.collection(COLLECTION_NAME);

      await assertProfilesExist(
        db,
        followerObjectId,
        followingObjectId,
        session,
      );

      await followsCollection.insertOne(
        {
          followerId: followerObjectId,
          followingId: followingObjectId,
          createdAt: new Date(),
        },
        { session },
      );

      await incrementFollowing(followerId, { session });
      await incrementFollowers(followingId, { session });
    });

    return {
      following: true,
      followerId,
      followingId,
    };
  } catch (error) {
    if (isDuplicateFollowError(error)) {
      return {
        following: true,
        followerId,
        followingId,
      };
    }

    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    const followsCollection = db.collection(COLLECTION_NAME);

    await assertProfilesExist(db, followerObjectId, followingObjectId);

    try {
      await followsCollection.insertOne({
        followerId: followerObjectId,
        followingId: followingObjectId,
        createdAt: new Date(),
      });
    } catch (fallbackError) {
      if (isDuplicateFollowError(fallbackError)) {
        return {
          following: true,
          followerId,
          followingId,
        };
      }

      throw fallbackError;
    }

    await incrementFollowing(followerId);
    await incrementFollowers(followingId);

    return {
      following: true,
      followerId,
      followingId,
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const unfollowUser = async (followerId, followingId) => {
  assertValidObjectId(followerId, "follower id");
  assertValidObjectId(followingId, "following id");

  if (String(followerId) === String(followingId)) {
    return false;
  }

  const followerObjectId = new ObjectId(followerId);
  const followingObjectId = new ObjectId(followingId);

  const db = await connectToDatabase();
  const client = getClient();
  let session;

  try {
    session = client.startSession();

    let shouldDecrement = false;

    await session.withTransaction(async () => {
      const followsCollection = db.collection(COLLECTION_NAME);

      await assertProfilesExist(
        db,
        followerObjectId,
        followingObjectId,
        session,
      );

      const deleteResult = await followsCollection.deleteOne(
        {
          followerId: followerObjectId,
          followingId: followingObjectId,
        },
        { session },
      );

      shouldDecrement = deleteResult.deletedCount > 0;

      if (!shouldDecrement) {
        return;
      }

      await decrementFollowing(followerId, { session });
      await decrementFollowers(followingId, { session });
    });

    return {
      following: false,
      followerId,
      followingId,
    };
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    const followsCollection = db.collection(COLLECTION_NAME);

    await assertProfilesExist(db, followerObjectId, followingObjectId);

    const deleteResult = await followsCollection.deleteOne({
      followerId: followerObjectId,
      followingId: followingObjectId,
    });

    if (deleteResult.deletedCount > 0) {
      await decrementFollowing(followerId);
      await decrementFollowers(followingId);
    }

    return {
      following: false,
      followerId,
      followingId,
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const isFollowingUser = async (followerId, followingId) => {
  const { followerObjectId, followingObjectId } = normalizeFollowIds(
    followerId,
    followingId,
  );

  if (followerObjectId.equals(followingObjectId)) {
    return false;
  }

  const db = await connectToDatabase();

  const follow = await db.collection(COLLECTION_NAME).findOne(
    {
      followerId: followerObjectId,
      followingId: followingObjectId,
    },
    { projection: { _id: 1 } },
  );

  return Boolean(follow);
};

const buildActiveProfileLookup = (localField) => ({
  $lookup: {
    from: "profiles",
    let: { uid: `$${localField}` },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ["$userId", "$$uid"] },
          deletedAt: null,
        },
      },
      { $project: { _id: 1 } },
    ],
    as: "_activeProfile",
  },
});

const getFollowerUserIds = async (
  userId,
  { cursor = null, limit = 20 } = {},
) => {
  assertValidObjectId(userId, "user id");

  const db = await connectToDatabase();
  const userObjectId = new ObjectId(userId);

  const cursorMatch =
    cursor && ObjectId.isValid(cursor)
      ? { _id: { $lt: new ObjectId(cursor) } }
      : {};

  const baseStages = [
    { $match: { followingId: userObjectId } },
    { $sort: { _id: -1 } },
    buildActiveProfileLookup("followerId"),
    { $match: { "_activeProfile.0": { $exists: true } } },
  ];

  const [rows, countResult] = await Promise.all([
    db
      .collection(COLLECTION_NAME)
      .aggregate([
        { $match: { followingId: userObjectId, ...cursorMatch } },
        { $sort: { _id: -1 } },
        buildActiveProfileLookup("followerId"),
        { $match: { "_activeProfile.0": { $exists: true } } },
        { $limit: limit + 1 },
      ])
      .toArray(),
    db
      .collection(COLLECTION_NAME)
      .aggregate([...baseStages, { $count: "total" }])
      .next(),
  ]);

  const hasMore = rows.length > limit;
  const pagedRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? pagedRows[pagedRows.length - 1]._id.toString()
    : null;

  return {
    data: pagedRows.map((row) => row.followerId.toString()),
    nextCursor,
    hasMore,
    total: countResult?.total ?? 0,
  };
};

const getFollowingUserIds = async (
  userId,
  { cursor = null, limit = 20 } = {},
) => {
  assertValidObjectId(userId, "user id");

  const db = await connectToDatabase();
  const userObjectId = new ObjectId(userId);

  const cursorMatch =
    cursor && ObjectId.isValid(cursor)
      ? { _id: { $lt: new ObjectId(cursor) } }
      : {};

  const baseStages = [
    { $match: { followerId: userObjectId } },
    { $sort: { _id: -1 } },
    buildActiveProfileLookup("followingId"),
    { $match: { "_activeProfile.0": { $exists: true } } },
  ];

  const [rows, countResult] = await Promise.all([
    db
      .collection(COLLECTION_NAME)
      .aggregate([
        { $match: { followerId: userObjectId, ...cursorMatch } },
        { $sort: { _id: -1 } },
        buildActiveProfileLookup("followingId"),
        { $match: { "_activeProfile.0": { $exists: true } } },
        { $limit: limit + 1 },
      ])
      .toArray(),
    db
      .collection(COLLECTION_NAME)
      .aggregate([...baseStages, { $count: "total" }])
      .next(),
  ]);

  const hasMore = rows.length > limit;
  const pagedRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? pagedRows[pagedRows.length - 1]._id.toString()
    : null;

  return {
    data: pagedRows.map((row) => row.followingId.toString()),
    nextCursor,
    hasMore,
    total: countResult?.total ?? 0,
  };
};

module.exports = {
  followUser,
  unfollowUser,
  isFollowingUser,
  getFollowerUserIds,
  getFollowingUserIds,
};
