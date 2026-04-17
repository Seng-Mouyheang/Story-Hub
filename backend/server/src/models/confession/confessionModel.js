const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "confessions";

const PROTECTED_FIELDS = [
  "_id",
  "authorId",
  "views",
  "likesCount",
  "commentCount",
  "isEdited",
  "createdAt",
  "deletedAt",
];

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

const REGEX_SPECIAL_CHARACTERS = new Set([
  "\\",
  "^",
  "$",
  ".",
  "|",
  "?",
  "*",
  "+",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
]);

const escapeRegex = (value) =>
  [...value]
    .map((character) =>
      REGEX_SPECIAL_CHARACTERS.has(character) ? `\\${character}` : character,
    )
    .join("");

const resolveAuthorDisplayName = (confession, currentUserId = null) => {
  const profileName = confession.author?.displayName || null;

  if (!confession.isAnonymous) {
    return profileName;
  }

  if (
    currentUserId &&
    ObjectId.isValid(currentUserId) &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return profileName || "Anonymous";
  }

  return "Anonymous";
};

const resolveAuthorProfilePicture = (confession, currentUserId = null) => {
  const profilePicture = confession.author?.profilePicture || "";

  if (!confession.isAnonymous) {
    return profilePicture;
  }

  if (
    currentUserId &&
    ObjectId.isValid(currentUserId) &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return profilePicture;
  }

  return "";
};

const createConfession = async (confessionData) => {
  const collection = await getCollection();
  const wordCount = confessionData.content.trim().split(/\s+/).length;

  const confession = {
    authorId: new ObjectId(confessionData.authorId),
    content: confessionData.content,
    tags: confessionData.tags || [],
    isAnonymous: confessionData.isAnonymous !== false,
    visibility: confessionData.visibility || "public",
    isEdited: false,
    views: 0,
    likesCount: 0,
    commentCount: 0,
    wordCount,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const result = await collection.insertOne(confession);
  return result.insertedId;
};

const getPublishedConfessions = async (cursor, limit, currentUserId, tag) => {
  const db = await connectToDatabase();
  const collection = await getCollection();

  const matchStage = {
    visibility: "public",
    deletedAt: null,
  };

  if (typeof tag === "string" && tag.trim()) {
    const escapedTag = escapeRegex(tag.trim());
    matchStage.tags = {
      $elemMatch: {
        $regex: `^${escapedTag}$`,
        $options: "i",
      },
    };
  }

  if (cursor && typeof cursor === "string" && cursor.includes("_")) {
    const [createdAtStr, id] = cursor.split("_");

    if (createdAtStr && id && ObjectId.isValid(id)) {
      const createdAtDate = new Date(createdAtStr);
      if (!Number.isNaN(createdAtDate.getTime())) {
        matchStage.$or = [
          {
            createdAt: { $lt: createdAtDate },
          },
          {
            createdAt: createdAtDate,
            _id: { $lt: new ObjectId(id) },
          },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$authorId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const confessions = await collection.aggregate(pipeline).toArray();

  const hasMore = confessions.length > limit;
  const data = hasMore ? confessions.slice(0, limit) : confessions;

  let likedConfessionIds = new Set();
  let bookmarkedConfessionIds = new Set();
  let followedAuthorIds = new Set();

  if (currentUserId && ObjectId.isValid(currentUserId) && data.length > 0) {
    const currentUserObjectId = new ObjectId(currentUserId);
    const confessionIds = data.map((confession) => confession._id);
    const authorIds = [
      ...new Set(data.map((confession) => confession.authorId.toString())),
    ].map((id) => new ObjectId(id));

    const [likes, bookmarks, follows] = await Promise.all([
      db
        .collection("confessionLikes")
        .find({
          userId: currentUserObjectId,
          confessionId: { $in: confessionIds },
        })
        .project({ confessionId: 1 })
        .toArray(),
      db
        .collection("confessionBookmarks")
        .find({
          userId: currentUserObjectId,
          confessionId: { $in: confessionIds },
        })
        .project({ confessionId: 1 })
        .toArray(),
      db
        .collection("follows")
        .find({
          followerId: currentUserObjectId,
          followingId: { $in: authorIds },
        })
        .project({ followingId: 1 })
        .toArray(),
    ]);

    likedConfessionIds = new Set(
      likes.map((like) => like.confessionId.toString()),
    );

    bookmarkedConfessionIds = new Set(
      bookmarks.map((bookmark) => bookmark.confessionId.toString()),
    );

    followedAuthorIds = new Set(
      follows.map((follow) => follow.followingId.toString()),
    );
  }

  const finalData = data.map((confession) => ({
    ...confession,
    likedByCurrentUser: likedConfessionIds.has(confession._id.toString()),
    savedByCurrentUser: bookmarkedConfessionIds.has(confession._id.toString()),
    followedByCurrentUser: followedAuthorIds.has(
      confession.authorId.toString(),
    ),
    authorDisplayName: resolveAuthorDisplayName(confession, currentUserId),
    authorProfilePicture: resolveAuthorProfilePicture(
      confession,
      currentUserId,
    ),
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastConfession = data[data.length - 1];
    nextCursor = `${lastConfession.createdAt.toISOString()}_${lastConfession._id}`;
  }

  return {
    data: finalData,
    nextCursor,
    hasMore,
  };
};

const getPublishedConfessionsByTag = async (
  tag,
  cursor,
  limit,
  currentUserId,
) => {
  return getPublishedConfessions(cursor, limit, currentUserId, tag);
};

const getConfessionById = async (id, currentUserId = null) => {
  const db = await connectToDatabase();
  const collection = await getCollection();

  const pipeline = [
    {
      $match: {
        _id: new ObjectId(id),
        deletedAt: null,
      },
    },
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$authorId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const confession = await collection.aggregate(pipeline).next();

  if (!confession) {
    return null;
  }

  let followedByCurrentUser = false;
  let savedByCurrentUser = false;
  let likedByCurrentUser = false;

  if (currentUserId && ObjectId.isValid(currentUserId)) {
    const follow = await db.collection("follows").findOne(
      {
        followerId: new ObjectId(currentUserId),
        followingId: confession.authorId,
      },
      { projection: { _id: 1 } },
    );

    followedByCurrentUser = Boolean(follow);

    const bookmark = await db.collection("confessionBookmarks").findOne(
      {
        userId: new ObjectId(currentUserId),
        confessionId: confession._id,
      },
      { projection: { _id: 1 } },
    );

    savedByCurrentUser = Boolean(bookmark);

    const like = await db.collection("confessionLikes").findOne(
      {
        userId: new ObjectId(currentUserId),
        confessionId: confession._id,
      },
      { projection: { _id: 1 } },
    );

    likedByCurrentUser = Boolean(like);
  }

  return {
    ...confession,
    likedByCurrentUser,
    followedByCurrentUser,
    savedByCurrentUser,
    authorDisplayName: resolveAuthorDisplayName(confession, currentUserId),
    authorProfilePicture: resolveAuthorProfilePicture(
      confession,
      currentUserId,
    ),
  };
};

const updateConfession = async (id, userId, updateData) => {
  const collection = await getCollection();

  const confession = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!confession) throw new Error("not found");

  if (confession.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  PROTECTED_FIELDS.forEach((field) => delete updateData[field]);

  if (Object.keys(updateData).length === 0) {
    return { matchedCount: 1, modifiedCount: 0 };
  }

  if (updateData.content) {
    updateData.wordCount = updateData.content.trim().split(/\s+/).length;
  }

  return collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updateData,
        isEdited: true,
        updatedAt: new Date(),
      },
    },
  );
};

const incrementViews = async (id) => {
  const collection = await getCollection();
  return collection.updateOne(
    { _id: new ObjectId(id), deletedAt: null },
    { $inc: { views: 1 } },
  );
};

const isTransactionUnsupportedError = (error) =>
  /Transaction numbers are only allowed on a replica set member or mongos|Transaction not supported|does not support transactions|replica set/i.test(
    error?.message || "",
  );

const deleteConfession = async (id, userId) => {
  const db = await connectToDatabase();
  const collection = await getCollection();
  const confessionObjectId = new ObjectId(id);
  const deletedAt = new Date();

  const confession = await collection.findOne({
    _id: confessionObjectId,
    deletedAt: null,
  });

  if (!confession) throw new Error("not found");

  if (confession.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  const client = getClient();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      await collection.updateOne(
        { _id: confessionObjectId },
        { $set: { deletedAt } },
        { session },
      );

      await db
        .collection("confessionBookmarks")
        .deleteMany({ confessionId: confessionObjectId }, { session });

      await db
        .collection("confessionLikes")
        .deleteMany({ confessionId: confessionObjectId }, { session });
    });

    return { success: true };
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    try {
      await collection.updateOne(
        { _id: confessionObjectId },
        { $set: { deletedAt } },
      );

      await db.collection("confessionBookmarks").deleteMany({
        confessionId: confessionObjectId,
      });

      await db.collection("confessionLikes").deleteMany({
        confessionId: confessionObjectId,
      });

      return { success: true };
    } catch (fallbackError) {
      console.error("Confession delete fallback failed", {
        confessionObjectId: confessionObjectId.toString(),
        error: fallbackError,
      });
      throw fallbackError;
    }
  } finally {
    await session.endSession();
  }
};

const restoreConfession = async (id, userId) => {
  const db = await connectToDatabase();
  const collection = await getCollection();
  const confessionObjectId = new ObjectId(id);

  const confession = await collection.findOne({ _id: confessionObjectId });

  if (!confession) throw new Error("not found");

  if (confession.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  if (confession.deletedAt === null) {
    throw new Error("Already active");
  }

  const actualLikesCount = await db
    .collection("confessionLikes")
    .countDocuments({ confessionId: confessionObjectId });

  const result = await collection.updateOne(
    { _id: confessionObjectId, deletedAt: { $ne: null } },
    {
      $set: {
        deletedAt: null,
        likesCount: actualLikesCount,
        updatedAt: new Date(),
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new Error("not found");
  }

  return { success: true };
};

const getUserConfessions = async (userId, cursor, limit) => {
  const collection = await getCollection();
  const parsedLimit = Number.parseInt(limit, 10) || 10;

  const matchStage = {
    authorId: new ObjectId(userId),
    deletedAt: null,
  };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [updatedAtStr, id] = cursor.split("_");

    if (updatedAtStr && id && ObjectId.isValid(id)) {
      const updatedAtDate = new Date(updatedAtStr);
      if (!Number.isNaN(updatedAtDate.getTime())) {
        matchStage.$or = [
          { updatedAt: { $lt: updatedAtDate } },
          {
            updatedAt: updatedAtDate,
            _id: { $lt: new ObjectId(id) },
          },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { updatedAt: -1, _id: -1 } },
    { $limit: parsedLimit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$authorId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const confessions = await collection.aggregate(pipeline).toArray();

  const hasMore = confessions.length > parsedLimit;
  const data = hasMore ? confessions.slice(0, parsedLimit) : confessions;

  const finalData = data.map((confession) => ({
    ...confession,
    followedByCurrentUser: false,
    authorDisplayName: resolveAuthorDisplayName(confession, userId),
    authorProfilePicture: resolveAuthorProfilePicture(confession, userId),
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastConfession = data[data.length - 1];
    nextCursor = `${lastConfession.updatedAt.toISOString()}_${lastConfession._id}`;
  }

  return {
    data: finalData,
    nextCursor,
    hasMore,
  };
};

const getDeletedUserConfessions = async (userId, cursor, limit) => {
  const collection = await getCollection();
  const parsedLimit = Number.parseInt(limit, 10) || 10;

  const matchStage = {
    authorId: new ObjectId(userId),
    deletedAt: { $ne: null },
  };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [deletedAtStr, id] = cursor.split("_");

    if (deletedAtStr && id && ObjectId.isValid(id)) {
      const deletedAtDate = new Date(deletedAtStr);
      if (!Number.isNaN(deletedAtDate.getTime())) {
        matchStage.$or = [
          { deletedAt: { $lt: deletedAtDate } },
          {
            deletedAt: deletedAtDate,
            _id: { $lt: new ObjectId(id) },
          },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { deletedAt: -1, _id: -1 } },
    { $limit: parsedLimit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$authorId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1, profilePicture: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const confessions = await collection.aggregate(pipeline).toArray();

  const hasMore = confessions.length > parsedLimit;
  const data = hasMore ? confessions.slice(0, parsedLimit) : confessions;

  const finalData = data.map((confession) => ({
    ...confession,
    followedByCurrentUser: false,
    authorDisplayName: resolveAuthorDisplayName(confession, userId),
    authorProfilePicture: resolveAuthorProfilePicture(confession, userId),
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastConfession = data[data.length - 1];
    nextCursor = `${lastConfession.deletedAt.toISOString()}_${lastConfession._id}`;
  }

  return {
    data: finalData,
    nextCursor,
    hasMore,
  };
};

module.exports = {
  createConfession,
  getPublishedConfessions,
  getPublishedConfessionsByTag,
  getConfessionById,
  updateConfession,
  deleteConfession,
  restoreConfession,
  incrementViews,
  getUserConfessions,
  getDeletedUserConfessions,
};
