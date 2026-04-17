const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const BOOKMARKS_COLLECTION = "storyBookmarks";
const isDuplicateBookmarkError = (error) => error?.code === 11000;

const isTransactionUnsupportedError = (error) =>
  /Transaction numbers are only allowed on a replica set member or mongos|Transaction not supported|does not support transactions|replica set/i.test(
    error?.message || "",
  );

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
        try {
          await bookmarksCollection.insertOne(
            {
              userId: userObjectId,
              storyId: storyObjectId,
              createdAt: new Date(),
            },
            { session },
          );
        } catch (insertError) {
          if (!isDuplicateBookmarkError(insertError)) {
            throw insertError;
          }
        }
        savedByCurrentUser = true;
      }
    });

    return {
      savedByCurrentUser,
      storyId,
    };
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    try {
      const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

      const existingBookmark = await bookmarksCollection.findOne({
        userId: userObjectId,
        storyId: storyObjectId,
      });

      let savedByCurrentUser = false;

      if (existingBookmark) {
        await bookmarksCollection.deleteOne({
          userId: userObjectId,
          storyId: storyObjectId,
        });
      } else {
        try {
          await bookmarksCollection.insertOne({
            userId: userObjectId,
            storyId: storyObjectId,
            createdAt: new Date(),
          });
          savedByCurrentUser = true;
        } catch (insertError) {
          if (!isDuplicateBookmarkError(insertError)) {
            throw insertError;
          }
        }
      }

      return {
        savedByCurrentUser,
        storyId,
      };
    } catch (fallbackError) {
      console.error("Bookmark operation failed:", fallbackError);
      throw fallbackError;
    }
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
          authorProfilePicture: "$author.profilePicture",
          savedByCurrentUser: { $literal: true },
          bookmarkId: "$_id",
          bookmarkCreatedAt: "$createdAt",
        },
      },
      { $limit: limit + 1 },
    ])
    .toArray();

  const hasMore = stories.length > limit;
  const data = hasMore ? stories.slice(0, limit) : stories;

  let likedStoryIds = new Set();
  if (data.length > 0) {
    const storyIds = data.map((story) => story._id);

    const likes = await db
      .collection("storyLikes")
      .find({
        userId: new ObjectId(userId),
        storyId: { $in: storyIds },
      })
      .project({ storyId: 1 })
      .toArray();

    likedStoryIds = new Set(likes.map((like) => like.storyId.toString()));
  }

  let followedAuthorIds = new Set();
  if (data.length > 0) {
    const authorIds = [
      ...new Set(data.map((story) => story.authorId.toString())),
    ]
      .filter((id) => id !== userId)
      .map((id) => new ObjectId(id));

    if (authorIds.length > 0) {
      const follows = await db
        .collection("follows")
        .find({
          followerId: new ObjectId(userId),
          followingId: { $in: authorIds },
        })
        .project({ followingId: 1 })
        .toArray();

      followedAuthorIds = new Set(
        follows.map((follow) => follow.followingId.toString()),
      );
    }
  }

  const finalData = data.map((story) => ({
    ...story,
    likedByCurrentUser: likedStoryIds.has(story._id.toString()),
    followedByCurrentUser: followedAuthorIds.has(story.authorId.toString()),
  }));

  let nextCursor = null;
  if (hasMore && data.length > 0) {
    const lastBookmark = data[data.length - 1];
    nextCursor = `${lastBookmark.bookmarkCreatedAt.toISOString()}_${lastBookmark.bookmarkId}`;
  }

  return {
    data: finalData,
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
