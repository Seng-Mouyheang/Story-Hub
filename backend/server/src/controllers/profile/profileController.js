const profileModel = require("../../models/profile/profileModel");
const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const { calculateUserStats } = require("../../services/userStatsService");
const {
  deleteFileByTrustedUrl,
  deleteOwnedUploadByCustomId,
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
    const { previousProfilePicture, previousCoverImage } =
      await profileModel.updateProfile(req.user.userId, req.body);

    res.json({ message: "Profile updated successfully" });

    // Best-effort cleanup of the images this update just replaced. Uses
    // only the URL this same request already read out of the user's own
    // profile document — never anything from the request body — so this
    // can never be tricked into deleting another user's file.
    if (
      Object.hasOwn(req.body, "profilePicture") &&
      previousProfilePicture &&
      previousProfilePicture !== req.body.profilePicture
    ) {
      deleteFileByTrustedUrl(previousProfilePicture).catch(() => {});
    }

    if (
      Object.hasOwn(req.body, "coverImage") &&
      previousCoverImage &&
      previousCoverImage !== req.body.coverImage
    ) {
      deleteFileByTrustedUrl(previousCoverImage).catch(() => {});
    }
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
 * Delete a profile/cover image upload that was never saved to the user's
 * profile (e.g. the user picked a new image before saving, replacing an
 * in-progress upload, or discarded the edit entirely). Authorized via the
 * upload's `customId`, which was bound to the requesting user server-side
 * at upload-request time — see uploadThingRoute.js's `.middleware()` — not
 * by anything the client asserts in this request.
 */
const deleteUpload = async (req, res) => {
  try {
    const result = await deleteOwnedUploadByCustomId(
      req.body.customId,
      req.user.userId,
    );

    if (!result.deleted) {
      if (result.reason === "forbidden") {
        return res.status(403).json({
          message: "You don't have permission to delete this file.",
        });
      }

      return res.status(400).json({ message: "Invalid upload id." });
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
  deleteUpload,
};
