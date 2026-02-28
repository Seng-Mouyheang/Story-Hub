const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "stories";

const PROTECTED_FIELDS = [
  "_id",
  "authorId",
  "views",
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

/**
 * Get stories by Status
 * no @param
 */

// Offset Pagination
// const getPublishedStories = async (page, limit) => {
//   const collection = await getCollection();

//   const filter = {
//     status: "published",
//     visibility: "public",
//     deletedAt: null,
//   };

//   const skip = (page - 1) * limit;

//   const [stories, totalItems] = await Promise.all([
//     collection
//       .find(filter)
//       .sort({ publishedAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .toArray(),
//     collection.countDocuments(filter),
//   ]);

//   const totalPages = Math.ceil(totalItems / limit);

//   return {
//     data: stories,
//     pagination: {
//       page,
//       limit,
//       totalItems,
//       totalPages,
//       hasNextPage: page < totalPages,
//       hasPrevPage: page > 1,
//     },
//   };
// };

// Cursor Pagination
const getPublishedStories = async (cursor, limit, currentUserId) => {
  const collection = await getCollection();

  const userObjectId = currentUserId ? new ObjectId(currentUserId) : null;

  // console.log("currentUserId:", currentUserId);
  // console.log("userObjectId:", userObjectId);

  const filter = {
    status: "published",
    visibility: "public",
    deletedAt: null,
  };

  // If cursor exists, extract values
  if (cursor) {
    const [publishedAtStr, id] = cursor.split("_");

    filter.$or = [
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
    { $match: filter },

    {
      $sort: { publishedAt: -1, _id: -1 },
    },

    {
      $limit: limit + 1,
    },

    {
      $lookup: {
        from: "storyLikes",
        let: { storyId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$storyId", "$$storyId"],
              },
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              likedByCurrentUser: {
                $max: {
                  $cond: [
                    {
                      $and: [
                        { $ne: [userObjectId, null] },
                        { $eq: ["$userId", userObjectId] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: "likesData",
      },
    },
    {
      $addFields: {
        likesCount: {
          $ifNull: [{ $arrayElemAt: ["$likesData.count", 0] }, 0],
        },
        likedByCurrentUser: {
          $toBool: {
            $ifNull: [
              { $arrayElemAt: ["$likesData.likedByCurrentUser", 0] },
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        likesData: 0,
      },
    },
  ];

  const stories = await collection.aggregate(pipeline).toArray();

  // Handle limit + 1 logic
  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  let nextCursor = null;

  if (hasMore) {
    const lastStory = data[data.length - 1];
    nextCursor = `${lastStory.publishedAt.toISOString()}_${lastStory._id}`;
  }

  return {
    data,
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
  return collection.findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });
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

  // return collection.updateOne(
  //   { _id: new ObjectId(id) },
  //   { $set: { deletedAt: new Date() }, },
  // );

  // Cascade delete likes
  await db.collection("storyLikes").deleteMany({
    storyId: new ObjectId(id),
  });

  return { success: true };
};

const getUserStories = async (userId, cursor, limit) => {
  const collection = await getCollection();
  limit = parseInt(limit, 10) || 10;

  const filter = {
    authorId: new ObjectId(userId),
    deletedAt: null,
  };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [updatedAtStr, id] = cursor.split("_");

    filter.$or = [
      { updatedAt: { $lt: new Date(updatedAtStr) } },
      {
        updatedAt: new Date(updatedAtStr),
        _id: { $lt: new ObjectId(id) },
      },
    ];
  }

  const stories = await collection
    .find(filter)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit)
    .toArray();

  let nextCursor = null;

  if (stories.length === limit) {
    const lastStory = stories[stories.length - 1];
    nextCursor = `${lastStory.updatedAt.toISOString()}_${lastStory._id}`;
  }

  return {
    data: stories,
    nextCursor,
    hasMore: stories.length === limit,
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
