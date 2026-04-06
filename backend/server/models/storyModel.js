const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "stories";

const PROTECTED_FIELDS = [
  "_id",
  "authorId",
  "views",
  "likesCount",
  "commentCount",
  "createdAt",
  "deletedAt",
  "publishedAt",
];

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

/**
 * Create a new story
 * @param {Object} storyData
 * @returns {ObjectId}
 */

const createStory = async (storyData) => {
  const collection = await getCollection();
  const wordCount = storyData.content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 wpm average

  const story = {
    authorId: new ObjectId(storyData.authorId),
    title: storyData.title,
    summary: storyData.summary,
    content: storyData.content,
    genres: storyData.genres || [],
    tags: storyData.tags || [],
    visibility: storyData.visibility || "private",
    status: storyData.status || "draft",
    views: 0,
    likesCount: 0,
    commentCount: 0,
    wordCount,
    readingTime,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: storyData.status === "published" ? new Date() : null,
    deletedAt: null,
  };

  const result = await collection.insertOne(story);
  return result.insertedId;
};

// Cursor Pagination
const getPublishedStories = async (cursor, limit, currentUserId) => {
  const db = await connectToDatabase();
  const collection = await getCollection();

  const matchStage = {
    status: "published",
    visibility: "public",
    deletedAt: null,
  };

  // If cursor exists, extract values
  if (cursor) {
    const [publishedAtStr, id] = cursor.split("_");

    matchStage.$or = [
      {
        publishedAt: { $lt: new Date(publishedAtStr) },
      },
      {
        publishedAt: new Date(publishedAtStr),
        _id: { $lt: new ObjectId(id) },
      },
    ];
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { publishedAt: -1, _id: -1 } },
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
            $project: { displayName: 1 },
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

  const stories = await collection.aggregate(pipeline).toArray();

  // Handle limit + 1 logic
  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  let likedStoryIds = new Set();
  let bookmarkedStoryIds = new Set();

  if (currentUserId && data.length > 0) {
    const storyIds = data.map((story) => story._id);

    const likes = await db
      .collection("storyLikes")
      .find({
        userId: new ObjectId(currentUserId),
        storyId: { $in: storyIds },
      })
      .project({ storyId: 1 })
      .toArray();

    likedStoryIds = new Set(likes.map((like) => like.storyId.toString()));

    const bookmarks = await db
      .collection("storyBookmarks")
      .find({
        userId: new ObjectId(currentUserId),
        storyId: { $in: storyIds },
      })
      .project({ storyId: 1 })
      .toArray();

    bookmarkedStoryIds = new Set(
      bookmarks.map((bookmark) => bookmark.storyId.toString()),
    );
  }

  const finalData = data.map((story) => ({
    ...story,
    likedByCurrentUser: likedStoryIds.has(story._id.toString()),
    savedByCurrentUser: bookmarkedStoryIds.has(story._id.toString()),
    authorDisplayName: story.author?.displayName || null,
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastStory = data[data.length - 1];
    nextCursor = `${lastStory.publishedAt.toISOString()}_${lastStory._id}`;
  }

  return {
    data: finalData,
    nextCursor,
    hasMore,
  };
};

/**
 * Get stories by ID
 * @param {string} id
 */

const getStoryById = async (id) => {
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
            $project: { displayName: 1 },
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

  const story = await collection.aggregate(pipeline).next();

  if (story) {
    return {
      ...story,
      authorDisplayName: story.author?.displayName || null,
    };
  }

  return null;
};

/**
 * Update stories by ID
 * @param {string} id
 * @param {string} userId
 * @param {string} updateData
 */

const updateStory = async (id, userId, updateData) => {
  const collection = await getCollection();

  const story = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!story) throw new Error("not found");

  // Ensure only the author can update
  if (story.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  // Remove protected fields
  PROTECTED_FIELDS.forEach((field) => delete updateData[field]);

  // Handle content update
  if (updateData.content) {
    const wordCount = updateData.content.trim().split(/\s+/).length;
    updateData.wordCount = wordCount;
    updateData.readingTime = Math.ceil(wordCount / 200);
  }

  // Handle publishing logic
  if (updateData.status === "published" && story.status !== "published") {
    updateData.publishedAt = new Date();
  }

  return collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...updateData,
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

/**
 * Delete stories by ID
 * @param {string} id
 * @param {string} userId
 */

const deleteStory = async (id, userId) => {
  const db = await connectToDatabase();
  const collection = await getCollection();

  const story = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });

  if (!story) throw new Error("not found");

  if (story.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  // Soft delete story
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date() } },
  );

  // Cascade delete likes
  await db.collection("storyLikes").deleteMany({
    storyId: new ObjectId(id),
  });

  // Cascade delete bookmarks
  await db.collection("storyBookmarks").deleteMany({
    storyId: new ObjectId(id),
  });

  return { success: true };
};

const getUserStories = async (userId, cursor, limit) => {
  const collection = await getCollection();
  limit = Number.parseInt(limit, 10) || 10;

  const matchStage = {
    authorId: new ObjectId(userId),
    deletedAt: null,
  };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [updatedAtStr, id] = cursor.split("_");

    matchStage.$or = [
      { updatedAt: { $lt: new Date(updatedAtStr) } },
      {
        updatedAt: new Date(updatedAtStr),
        _id: { $lt: new ObjectId(id) },
      },
    ];
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { updatedAt: -1, _id: -1 } },
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
            $project: { displayName: 1 },
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

  const stories = await collection.aggregate(pipeline).toArray();

  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  const finalData = data.map((story) => ({
    ...story,
    authorDisplayName: story.author?.displayName || null,
  }));

  let nextCursor = null;

  if (hasMore) {
    const lastStory = data[data.length - 1];
    nextCursor = `${lastStory.updatedAt.toISOString()}_${lastStory._id}`;
  }

  return {
    data: finalData,
    nextCursor,
    hasMore,
  };
};

module.exports = {
  createStory,
  getPublishedStories,
  getStoryById,
  updateStory,
  deleteStory,
  incrementViews,

  getUserStories,
};
