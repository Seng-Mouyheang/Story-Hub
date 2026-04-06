const { connectToDatabase, getClient } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const BOOKMARKS_COLLECTION = "storyBookmarks";

const toggleStoryBookmark = async (userId, storyId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const userObjectId = new ObjectId(userId);
  const storyObjectId = new ObjectId(storyId);

  try {
    let savedByCurrentUser = false;

    await session.withTransaction(async () => {
      const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

      const existingBookmark = await bookmarksCollection.findOne(
        { userId: userObjectId, storyId: storyObjectId },
        { session },
      );

      if (existingBookmark) {
        await bookmarksCollection.deleteOne(
          { userId: userObjectId, storyId: storyObjectId },
          { session },
        );
        savedByCurrentUser = false;
      } else {
        await bookmarksCollection.insertOne(
          {
            userId: userObjectId,
            storyId: storyObjectId,
            createdAt: new Date(),
          },
          { session },
        );
        savedByCurrentUser = true;
      }
    });

    return {
      savedByCurrentUser,
      storyId,
    };
  } catch (error) {
    console.error("Bookmark transaction failed:", error);
    throw error;
  } finally {
    await session.endSession();
  }
};

const removeStoryBookmark = async (userId, storyId) => {
  const db = await connectToDatabase();
  const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

  await bookmarksCollection.deleteOne({
    userId: new ObjectId(userId),
    storyId: new ObjectId(storyId),
  });

  return {
    savedByCurrentUser: false,
    storyId,
  };
};

const hasUserBookmarkedStory = async (userId, storyId) => {
  const db = await connectToDatabase();
  const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

  const bookmark = await bookmarksCollection.findOne(
    {
      userId: new ObjectId(userId),
      storyId: new ObjectId(storyId),
    },
    { projection: { _id: 1 } },
  );

  return Boolean(bookmark);
};

const getUserBookmarkedStories = async (userId, cursor, limit) => {
  const db = await connectToDatabase();
  const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

  const matchStage = {
    userId: new ObjectId(userId),
  };

  if (cursor) {
    const [createdAtStr, bookmarkId] = cursor.split("_");
    const createdAtDate = new Date(createdAtStr);

    if (
      !Number.isNaN(createdAtDate.getTime()) &&
      ObjectId.isValid(bookmarkId)
    ) {
      matchStage.$or = [
        { createdAt: { $lt: createdAtDate } },
        {
          createdAt: createdAtDate,
          _id: { $lt: new ObjectId(bookmarkId) },
        },
      ];
    }
  }

  const stories = await bookmarksCollection
    .aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: "stories",
          let: { storyId: "$storyId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$storyId"] },
                status: "published",
                visibility: "public",
                deletedAt: null,
              },
            },
          ],
          as: "story",
        },
      },
      {
        $unwind: {
          path: "$story",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "profiles",
          let: { authorId: "$story.authorId" },
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
      {
        $project: {
          _id: "$story._id",
          authorId: "$story.authorId",
          title: "$story.title",
          summary: "$story.summary",
          content: "$story.content",
          genres: "$story.genres",
          tags: "$story.tags",
          likesCount: "$story.likesCount",
          commentCount: "$story.commentCount",
          createdAt: "$story.createdAt",
          updatedAt: "$story.updatedAt",
          publishedAt: "$story.publishedAt",
          authorDisplayName: "$author.displayName",
          savedByCurrentUser: { $literal: true },
          bookmarkId: "$_id",
          bookmarkCreatedAt: "$createdAt",
        },
      },
    ])
    .toArray();

  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  let nextCursor = null;
  if (hasMore && data.length > 0) {
    const lastBookmark = data[data.length - 1];
    nextCursor = `${lastBookmark.bookmarkCreatedAt.toISOString()}_${lastBookmark.bookmarkId}`;
  }

  return {
    data,
    nextCursor,
    hasMore,
  };
};

module.exports = {
  toggleStoryBookmark,
  removeStoryBookmark,
  hasUserBookmarkedStory,
  getUserBookmarkedStories,
};
