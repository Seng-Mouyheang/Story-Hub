const { connectToDatabase, getClient } = require("../configuration/dbConfig");
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

const assertProfilesExist = async (
  db,
  followerObjectId,
  followingObjectId,
  session,
) => {
  const profilesCollection = db.collection(PROFILES_COLLECTION);

  const [followerProfile, followingProfile] = await Promise.all([
    profilesCollection.findOne(
      { userId: followerObjectId, deletedAt: null },
      { projection: { _id: 1 }, session },
    ),
    profilesCollection.findOne(
      { userId: followingObjectId, deletedAt: null },
      { projection: { _id: 1 }, session },
    ),
  ]);

  if (!followerProfile) {
    throw new Error("Follower profile not found");
  }

  if (!followingProfile) {
    throw new Error("Following profile not found");
  }
};

const followUser = async (followerId, followingId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const { followerObjectId, followingObjectId } = normalizeFollowIds(
    followerId,
    followingId,
  );

  try {
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
    throw error;
  } finally {
    await session.endSession();
  }
};

const unfollowUser = async (followerId, followingId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const { followerObjectId, followingObjectId } = normalizeFollowIds(
    followerId,
    followingId,
  );

  try {
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
  } finally {
    await session.endSession();
  }
};

const isFollowingUser = async (followerId, followingId) => {
  const db = await connectToDatabase();
  const { followerObjectId, followingObjectId } = normalizeFollowIds(
    followerId,
    followingId,
  );

  const follow = await db.collection(COLLECTION_NAME).findOne(
    {
      followerId: followerObjectId,
      followingId: followingObjectId,
    },
    { projection: { _id: 1 } },
  );

  return Boolean(follow);
};

const getFollowerUserIds = async (
  userId,
  { cursor = null, limit = 20 } = {},
) => {
  assertValidObjectId(userId, "user id");

  const filter = { followingId: new ObjectId(userId) };
  if (cursor) {
    assertValidObjectId(cursor, "cursor");
    filter._id = { $lt: new ObjectId(cursor) };
  }

  const db = await connectToDatabase();
  const rows = await db
    .collection(COLLECTION_NAME)
    .find(filter, { projection: { followerId: 1 } })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = rows.length > limit;
  const pagedRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? pagedRows[pagedRows.length - 1]._id.toString()
    : null;

  return {
    data: pagedRows.map((row) => row.followerId.toString()),
    nextCursor,
    hasMore,
  };
};

const getFollowingUserIds = async (
  userId,
  { cursor = null, limit = 20 } = {},
) => {
  assertValidObjectId(userId, "user id");

  const filter = { followerId: new ObjectId(userId) };
  if (cursor) {
    assertValidObjectId(cursor, "cursor");
    filter._id = { $lt: new ObjectId(cursor) };
  }

  const db = await connectToDatabase();
  const rows = await db
    .collection(COLLECTION_NAME)
    .find(filter, { projection: { followingId: 1 } })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = rows.length > limit;
  const pagedRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? pagedRows[pagedRows.length - 1]._id.toString()
    : null;

  return {
    data: pagedRows.map((row) => row.followingId.toString()),
    nextCursor,
    hasMore,
  };
};

module.exports = {
  followUser,
  unfollowUser,
  isFollowingUser,
  getFollowerUserIds,
  getFollowingUserIds,
};
