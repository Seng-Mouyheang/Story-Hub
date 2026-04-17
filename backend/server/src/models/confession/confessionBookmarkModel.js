const {
  connectToDatabase,
  getClient,
} = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const BOOKMARKS_COLLECTION = "confessionBookmarks";
const isDuplicateBookmarkError = (error) => error?.code === 11000;

const isTransactionUnsupportedError = (error) =>
  /Transaction numbers are only allowed on a replica set member or mongos|Transaction not supported|does not support transactions|replica set/i.test(
    error?.message || "",
  );

const resolveAuthorDisplayName = (confession, currentUserId = null) => {
  const profileName = confession.authorDisplayName || null;

  if (!confession.isAnonymous) {
    return profileName;
  }

  if (
    currentUserId &&
    confession.authorId &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return profileName || "Anonymous";
  }

  return "Anonymous";
};

const resolveAuthorProfilePicture = (confession, currentUserId = null) => {
  const profilePicture = confession.authorProfilePicture || "";

  if (!confession.isAnonymous) {
    return profilePicture;
  }

  if (
    currentUserId &&
    confession.authorId &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return profilePicture;
  }

  return "";
};

const resolveAuthorId = (confession, currentUserId = null) => {
  if (!confession.authorId) {
    return null;
  }

  if (!confession.isAnonymous) {
    return confession.authorId;
  }

  if (
    currentUserId &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return confession.authorId;
  }

  return null;
};

const toggleConfessionBookmark = async (userId, confessionId) => {
  const db = await connectToDatabase();
  const client = getClient();
  const session = client.startSession();

  const userObjectId = new ObjectId(userId);
  const confessionObjectId = new ObjectId(confessionId);

  try {
    let savedByCurrentUser = false;
    let shouldRecheckSavedState = false;

    await session.withTransaction(async () => {
      const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

      const existingBookmark = await bookmarksCollection.findOne(
        { userId: userObjectId, confessionId: confessionObjectId },
        { session },
      );

      if (existingBookmark) {
        await bookmarksCollection.deleteOne(
          { userId: userObjectId, confessionId: confessionObjectId },
          { session },
        );
        savedByCurrentUser = false;
      } else {
        try {
          await bookmarksCollection.insertOne(
            {
              userId: userObjectId,
              confessionId: confessionObjectId,
              createdAt: new Date(),
            },
            { session },
          );
          savedByCurrentUser = true;
        } catch (insertError) {
          if (!isDuplicateBookmarkError(insertError)) {
            throw insertError;
          }
          shouldRecheckSavedState = true;
        }
      }
    });

    if (shouldRecheckSavedState) {
      const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);
      const existingBookmark = await bookmarksCollection.findOne(
        { userId: userObjectId, confessionId: confessionObjectId },
        { projection: { _id: 1 } },
      );
      savedByCurrentUser = Boolean(existingBookmark);
    }

    return {
      savedByCurrentUser,
      confessionId,
    };
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) {
      throw error;
    }

    try {
      const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

      const existingBookmark = await bookmarksCollection.findOne({
        userId: userObjectId,
        confessionId: confessionObjectId,
      });

      let savedByCurrentUser = false;

      if (existingBookmark) {
        await bookmarksCollection.deleteOne({
          userId: userObjectId,
          confessionId: confessionObjectId,
        });
      } else {
        let shouldRecheckSavedState = false;

        try {
          await bookmarksCollection.insertOne({
            userId: userObjectId,
            confessionId: confessionObjectId,
            createdAt: new Date(),
          });
          savedByCurrentUser = true;
        } catch (insertError) {
          if (!isDuplicateBookmarkError(insertError)) {
            throw insertError;
          }
          shouldRecheckSavedState = true;
        }

        if (shouldRecheckSavedState) {
          const bookmarkAfterConflict = await bookmarksCollection.findOne(
            { userId: userObjectId, confessionId: confessionObjectId },
            { projection: { _id: 1 } },
          );
          savedByCurrentUser = Boolean(bookmarkAfterConflict);
        }
      }
      return {
        savedByCurrentUser,
        confessionId,
      };
    } catch (fallbackError) {
      console.error("Bookmark operation failed:", fallbackError);
      throw fallbackError;
    }
  } finally {
    await session.endSession();
  }
};

const removeConfessionBookmark = async (userId, confessionId) => {
  const db = await connectToDatabase();
  const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

  await bookmarksCollection.deleteOne({
    userId: new ObjectId(userId),
    confessionId: new ObjectId(confessionId),
  });

  return {
    savedByCurrentUser: false,
    confessionId,
  };
};

const hasUserBookmarkedConfession = async (userId, confessionId) => {
  const db = await connectToDatabase();
  const bookmarksCollection = db.collection(BOOKMARKS_COLLECTION);

  const bookmark = await bookmarksCollection.findOne(
    {
      userId: new ObjectId(userId),
      confessionId: new ObjectId(confessionId),
    },
    { projection: { _id: 1 } },
  );

  return Boolean(bookmark);
};

const getUserBookmarkedConfessions = async (userId, cursor, limit) => {
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

  const confessions = await bookmarksCollection
    .aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $lookup: {
          from: "confessions",
          let: { confessionId: "$confessionId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$confessionId"] },
                visibility: "public",
                deletedAt: null,
              },
            },
          ],
          as: "confession",
        },
      },
      {
        $unwind: {
          path: "$confession",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "profiles",
          let: { authorId: "$confession.authorId" },
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
          _id: "$confession._id",
          authorId: "$confession.authorId",
          content: "$confession.content",
          tags: "$confession.tags",
          isAnonymous: "$confession.isAnonymous",
          likesCount: "$confession.likesCount",
          commentCount: "$confession.commentCount",
          createdAt: "$confession.createdAt",
          updatedAt: "$confession.updatedAt",
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

  const hasMore = confessions.length > limit;
  const data = hasMore ? confessions.slice(0, limit) : confessions;

  let likedConfessionIds = new Set();
  if (data.length > 0) {
    const confessionIds = data.map((confession) => confession._id);

    const likes = await db
      .collection("confessionLikes")
      .find({
        userId: new ObjectId(userId),
        confessionId: { $in: confessionIds },
      })
      .project({ confessionId: 1 })
      .toArray();

    likedConfessionIds = new Set(
      likes.map((like) => like.confessionId.toString()),
    );
  }

  let followedAuthorIds = new Set();
  if (data.length > 0) {
    const authorIds = [
      ...new Set(
        data
          .map((confession) => resolveAuthorId(confession, userId))
          .filter(Boolean)
          .map((authorId) => authorId.toString()),
      ),
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

  const finalData = data.map((confession) => {
    const resolvedAuthorId = resolveAuthorId(confession, userId);

    return {
      ...confession,
      authorId: resolvedAuthorId,
      likedByCurrentUser: likedConfessionIds.has(confession._id.toString()),
      followedByCurrentUser: resolvedAuthorId
        ? followedAuthorIds.has(resolvedAuthorId.toString())
        : false,
      authorDisplayName: resolveAuthorDisplayName(confession, userId),
      authorProfilePicture: resolveAuthorProfilePicture(confession, userId),
    };
  });

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
  toggleConfessionBookmark,
  removeConfessionBookmark,
  hasUserBookmarkedConfession,
  getUserBookmarkedConfessions,
};
