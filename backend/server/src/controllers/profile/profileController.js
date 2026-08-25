const profileModel = require("../../models/profile/profileModel");
const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const { calculateUserStats } = require("../../services/userStatsService");
const {
  confirmUploadOwnership,
  deleteUploadedFileByUrl,
} = require("../../services/uploadThingService");

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

/**
 * Confirms the requesting user owns a file they just uploaded to
 * uploadthing, so a later delete request for it can be authorized. The
 * frontend calls this immediately after every successful upload.
 */
const confirmUpload = async (req, res) => {
  try {
    await confirmUploadOwnership(req.body.url, req.user.userId);
    res.json({ message: "Upload confirmed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to confirm upload." });
  }
};

/**
 * Delete a previously uploaded profile/cover image that was never saved to
 * the user's profile (e.g. the user picked a new image before saving,
 * replacing an in-progress upload). Only accepts uploadthing URLs.
 */
const deleteUpload = async (req, res) => {
  try {
    const result = await deleteUploadedFileByUrl(req.body.url, req.user.userId);

    if (!result.deleted) {
      if (result.reason === "forbidden") {
        return res
          .status(403)
          .json({ message: "You don't have permission to delete this file." });
      }

      return res.status(400).json({ message: "Invalid upload URL." });
    }

    res.json({ message: "Upload deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete upload." });
  }
};

module.exports = {
  getProfile,
  searchAccounts,
  updateProfile,
  getUserStats,
  confirmUpload,
  deleteUpload,
};
