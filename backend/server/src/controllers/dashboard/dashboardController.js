const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const calculateUserStats = async (db, userObjectId) => {
  const [storyLikesResult, confessionLikesResult] = await Promise.all([
    db
      .collection("storyLikes")
      .aggregate([
        {
          $lookup: {
            from: "stories",
            localField: "storyId",
            foreignField: "_id",
            as: "story",
          },
        },
        {
          $unwind: "$story",
        },
        {
          $match: {
            "story.authorId": userObjectId,
            "story.deletedAt": null,
          },
        },
        {
          $count: "totalLikes",
        },
      ])
      .toArray(),
    db
      .collection("confessionLikes")
      .aggregate([
        {
          $lookup: {
            from: "confessions",
            localField: "confessionId",
            foreignField: "_id",
            as: "confession",
          },
        },
        {
          $unwind: "$confession",
        },
        {
          $match: {
            "confession.authorId": userObjectId,
            "confession.deletedAt": null,
          },
        },
        {
          $count: "totalLikes",
        },
      ])
      .toArray(),
  ]);

  const [storyWordsResult, confessionWordsResult] = await Promise.all([
    db
      .collection("stories")
      .aggregate([
        {
          $match: {
            authorId: userObjectId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalWords: { $sum: "$wordCount" },
            storyCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection("confessions")
      .aggregate([
        {
          $match: {
            authorId: userObjectId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalWords: { $sum: "$wordCount" },
            confessionCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const storyLikes = storyLikesResult[0]?.totalLikes || 0;
  const confessionLikes = confessionLikesResult[0]?.totalLikes || 0;
  const storyWords = storyWordsResult[0]?.totalWords || 0;
  const confessionWords = confessionWordsResult[0]?.totalWords || 0;
  const storyCount = storyWordsResult[0]?.storyCount || 0;
  const confessionCount = confessionWordsResult[0]?.confessionCount || 0;

  return {
    totalLikes: storyLikes + confessionLikes,
    totalWords: storyWords + confessionWords,
    totalPosts: storyCount + confessionCount,
    breakdown: {
      storyLikes,
      confessionLikes,
      storyWords,
      confessionWords,
      storyCount,
      confessionCount,
    },
  };
};

const getDashboardStats = async (req, res) => {
  try {
    const userObjectId = new ObjectId(req.user.userId);
    const db = await connectToDatabase();
    const stats = await calculateUserStats(db, userObjectId);

    res.json({
      userId: req.user.userId,
      stats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

const getDashboardStories = async (req, res) => {
  try {
    const userObjectId = new ObjectId(req.user.userId);
    const {
      status = "all",
      visibility = "all",
      deleted = "active",
      sortBy = "date",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Number.parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const db = await connectToDatabase();
    const storiesCollection = db.collection("stories");

    const matchStage = {
      authorId: userObjectId,
    };

    if (deleted === "active") {
      matchStage.deletedAt = null;
    } else if (deleted === "deleted") {
      matchStage.deletedAt = { $ne: null };
    }

    if (status !== "all") {
      matchStage.status = status;
    }

    if (visibility !== "all") {
      matchStage.visibility = visibility;
    }

    const sortField = sortBy === "likes" ? "likesCount" : "updatedAt";
    const sortDirection = order === "asc" ? 1 : -1;

    const [stories, total] = await Promise.all([
      storiesCollection
        .find(matchStage)
        .sort({ [sortField]: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .toArray(),
      storiesCollection.countDocuments(matchStage),
    ]);

    res.json({
      data: stories,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
      filters: {
        status,
        visibility,
        deleted,
        sortBy,
        order,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch dashboard stories" });
  }
};

const getDashboardConfessions = async (req, res) => {
  try {
    const userObjectId = new ObjectId(req.user.userId);
    const { sortBy = "date", order = "desc", page = 1, limit = 20 } = req.query;

    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Number.parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const db = await connectToDatabase();
    const confessionsCollection = db.collection("confessions");

    const matchStage = {
      authorId: userObjectId,
      deletedAt: null,
    };

    const sortField = sortBy === "likes" ? "likesCount" : "updatedAt";
    const sortDirection = order === "asc" ? 1 : -1;

    const [confessions, total] = await Promise.all([
      confessionsCollection
        .find(matchStage)
        .sort({ [sortField]: sortDirection, _id: sortDirection })
        .skip(skip)
        .limit(parsedLimit)
        .toArray(),
      confessionsCollection.countDocuments(matchStage),
    ]);

    res.json({
      data: confessions,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
      filters: {
        sortBy,
        order,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch dashboard confessions" });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardStories,
  getDashboardConfessions,
};
