const profileModel = require("../../models/profile/profileModel");
const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const getProfile = async (req, res) => {
  try {
    const profile = await Promise.resolve(
      profileModel.getProfileByUserId(req.params.userId),
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

const searchAccounts = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    const accounts = await profileModel.searchProfilesByUsernameOrDisplayName(
      q,
      limit,
    );

    res.json({ data: accounts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to search accounts" });
  }
};

const updateProfile = async (req, res) => {
  try {
    await profileModel.updateProfile(req.user.userId, req.body);
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    if (error.message === "Profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/**
 * Get user statistics including total likes, total words written, and total posts
 * @param {Object} req - Express request object with userId in params
 * @param {Object} res - Express response object
 */
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const userObjectId = new ObjectId(userId);
    const db = await connectToDatabase();

    // Get user profile to access posts count
    const profile = await db
      .collection("profiles")
      .findOne({ userId: userObjectId, deletedAt: null });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Get total likes on stories and confessions by this user
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

    const storyLikesCount = storyLikesResult[0]?.totalLikes || 0;
    const confessionLikesCount = confessionLikesResult[0]?.totalLikes || 0;
    const totalLikes = storyLikesCount + confessionLikesCount;

    // Get total words written across stories and confessions
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

    const storyWords = storyWordsResult[0]?.totalWords || 0;
    const storyCount = storyWordsResult[0]?.storyCount || 0;
    const confessionWords = confessionWordsResult[0]?.totalWords || 0;
    const confessionCount = confessionWordsResult[0]?.confessionCount || 0;

    const totalWords = storyWords + confessionWords;
    const totalPosts = storyCount + confessionCount;

    res.json({
      userId,
      stats: {
        totalLikes,
        totalWords,
        totalPosts,
        breakdown: {
          storyLikes: storyLikesCount,
          confessionLikes: confessionLikesCount,
          storyWords,
          confessionWords,
          storyCount,
          confessionCount,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
};

module.exports = {
  getProfile,
  searchAccounts,
  updateProfile,
  getUserStats,
};
