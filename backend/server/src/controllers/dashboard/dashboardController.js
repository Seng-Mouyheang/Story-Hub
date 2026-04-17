const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const { calculateUserStats } = require("../../services/userStatsService");

const getAuthenticatedUserObjectId = (req, res) => {
  if (!ObjectId.isValid(req.user?.userId)) {
    res.status(401).json({ message: "Invalid user id" });
    return null;
  }

  return new ObjectId(req.user.userId);
};

const getSortField = (sortBy) => {
  if (sortBy === "likes") {
    return "likesCount";
  }

  if (sortBy === "comments") {
    return "commentCount";
  }

  if (sortBy === "title") {
    return "title";
  }

  return "updatedAt";
};

const getTitleCollation = (sortBy) =>
  sortBy === "title" ? { locale: "en", strength: 2 } : undefined;

const applySortCollation = (cursor, sortBy) => {
  const collation = getTitleCollation(sortBy);
  return collation ? cursor.collation(collation) : cursor;
};

const buildActivityProjection = (type) => ({
  $project: {
    title: 1,
    likesCount: 1,
    commentCount: 1,
    createdAt: 1,
    updatedAt: 1,
    status: 1,
    visibility: 1,
    type: { $literal: type },
  },
});

const buildDashboardStoryMatchStage = ({
  userObjectId,
  status,
  visibility,
  deleted,
}) => {
  const matchStage = { authorId: userObjectId };

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

  return matchStage;
};

const buildDashboardConfessionMatchStage = ({
  userObjectId,
  status,
  visibility,
  deleted,
}) => {
  const notes = [];

  if (status !== "all") {
    notes.push(
      "Confessions were excluded because dashboard status filtering applies only to stories.",
    );

    return {
      matchStage: null,
      includeConfessions: false,
      notes,
    };
  }

  const matchStage = { authorId: userObjectId };

  if (deleted === "active") {
    matchStage.deletedAt = null;
  } else if (deleted === "deleted") {
    matchStage.deletedAt = { $ne: null };
  }

  if (visibility !== "all") {
    matchStage.visibility = visibility;
  }

  return {
    matchStage,
    includeConfessions: true,
    notes,
  };
};

const getDashboardStats = async (req, res) => {
  try {
    const userObjectId = getAuthenticatedUserObjectId(req, res);

    if (!userObjectId) {
      return;
    }

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
    const userObjectId = getAuthenticatedUserObjectId(req, res);

    if (!userObjectId) {
      return;
    }

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

    const matchStage = buildDashboardStoryMatchStage({
      userObjectId,
      status,
      visibility,
      deleted,
    });

    const sortField = getSortField(sortBy);
    const sortDirection = order === "asc" ? 1 : -1;

    const [stories, total] = await Promise.all([
      applySortCollation(
        storiesCollection
          .find(matchStage)
          .sort({ [sortField]: sortDirection, _id: sortDirection })
          .skip(skip)
          .limit(parsedLimit),
        sortBy,
      ).toArray(),
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
    const userObjectId = getAuthenticatedUserObjectId(req, res);

    if (!userObjectId) {
      return;
    }

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

    const sortField = getSortField(sortBy);
    const sortDirection = order === "asc" ? 1 : -1;

    const [confessions, total] = await Promise.all([
      applySortCollation(
        confessionsCollection
          .find(matchStage)
          .sort({ [sortField]: sortDirection, _id: sortDirection })
          .skip(skip)
          .limit(parsedLimit),
        sortBy,
      ).toArray(),
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

const getDashboardFeed = async (req, res) => {
  try {
    const userObjectId = getAuthenticatedUserObjectId(req, res);

    if (!userObjectId) {
      return;
    }

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
    const confessionsCollection = db.collection("confessions");

    const storyMatchStage = buildDashboardStoryMatchStage({
      userObjectId,
      status,
      visibility,
      deleted,
    });

    const {
      matchStage: confessionMatchStage,
      includeConfessions,
      notes,
    } = buildDashboardConfessionMatchStage({
      userObjectId,
      status,
      visibility,
      deleted,
    });

    const sortField = getSortField(sortBy);
    const sortDirection = order === "asc" ? 1 : -1;
    const collation = getTitleCollation(sortBy);

    const pipeline = [
      { $match: storyMatchStage },
      { $addFields: { type: { $literal: "story" } } },
      buildActivityProjection("story"),
      { $sort: { [sortField]: sortDirection, _id: sortDirection } },
      { $skip: skip },
      { $limit: parsedLimit },
    ];

    if (includeConfessions) {
      pipeline.splice(3, 0, {
        $unionWith: {
          coll: "confessions",
          pipeline: [
            { $match: confessionMatchStage },
            { $addFields: { type: { $literal: "confession" } } },
            buildActivityProjection("confession"),
          ],
        },
      });
    }

    const [feedItems, storyTotal, confessionTotal] = await Promise.all([
      storiesCollection
        .aggregate(pipeline, collation ? { collation } : {})
        .toArray(),
      storiesCollection.countDocuments(storyMatchStage),
      includeConfessions
        ? confessionsCollection.countDocuments(confessionMatchStage)
        : 0,
    ]);

    const total = storyTotal + confessionTotal;

    res.json({
      data: feedItems,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
      notes,
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
    res.status(500).json({ message: "Failed to fetch dashboard feed" });
  }
};

module.exports = {
  getDashboardStats,
  getDashboardFeed,
  getDashboardStories,
  getDashboardConfessions,
};
