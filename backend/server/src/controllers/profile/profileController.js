const profileModel = require("../../models/profile/profileModel");
const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const { calculateUserStats } = require("../../services/userStatsService");

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

    const stats = await calculateUserStats(db, userObjectId);

    res.json({
      userId,
      stats,
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
