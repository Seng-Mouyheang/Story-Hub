const followModel = require("../../models/profile/followModel");
const profileModel = require("../../models/profile/profileModel");

const FOLLOW_LIST_DEFAULT_LIMIT = 20;
const FOLLOW_LIST_MAX_LIMIT = 100;

const parseListOptions = (query = {}) => {
  const parsedLimit = Number.parseInt(query.limit, 10);
  const limit = Number.isNaN(parsedLimit)
    ? FOLLOW_LIST_DEFAULT_LIMIT
    : Math.max(1, Math.min(parsedLimit, FOLLOW_LIST_MAX_LIMIT));

  return {
    cursor: query.cursor || null,
    limit,
  };
};

const ensureProfileExists = async (userId) => {
  const profile = await profileModel.getProfileByUserId(userId);
  return Boolean(profile);
};

const followUser = async (req, res) => {
  try {
    const currentUserHasProfile = await ensureProfileExists(req.user.userId);
    if (!currentUserHasProfile) {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }

    const targetProfile = await profileModel.getProfileByUserId(
      req.params.userId,
    );
    if (!targetProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const result = await followModel.followUser(
      req.user.userId,
      req.params.userId,
    );
    res.json(result);
  } catch (error) {
    console.error(error);

    if (error.message === "You cannot follow yourself") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message === "Follower profile not found") {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }

    if (error.message === "Following profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message.startsWith("Invalid ")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to follow user" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const currentUserHasProfile = await ensureProfileExists(req.user.userId);
    if (!currentUserHasProfile) {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }

    const targetUserHasProfile = await ensureProfileExists(req.params.userId);
    if (!targetUserHasProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const result = await followModel.unfollowUser(
      req.user.userId,
      req.params.userId,
    );
    res.json(result);
  } catch (error) {
    console.error(error);

    if (error.message === "You cannot follow yourself") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message === "Follower profile not found") {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }

    if (error.message === "Following profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message.startsWith("Invalid ")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to unfollow user" });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const targetProfile = await profileModel.getProfileByUserId(
      req.params.userId,
    );
    if (!targetProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const userProfile = await profileModel.getProfileByUserId(req.user.userId);
    if (!userProfile) {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }
    const following = await followModel.isFollowingUser(
      req.user.userId,
      req.params.userId,
    );

    res.json({
      followerId: req.user.userId,
      followingId: req.params.userId,
      following,
    });
  } catch (error) {
    console.error(error);

    if (error.message === "You cannot follow yourself") {
      return res.status(400).json({ message: error.message });
    }

    if (error.message === "Profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message === "Follower profile not found") {
      return res
        .status(404)
        .json({ message: "Current user profile not found" });
    }

    if (error.message === "Following profile not found") {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (error.message.startsWith("Invalid ")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to fetch follow status" });
  }
};

const getFollowers = async (req, res) => {
  try {
    const profile = await profileModel.getProfileByUserId(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const listOptions = parseListOptions(req.query);
    const followerResult = await followModel.getFollowerUserIds(
      req.params.userId,
      listOptions,
    );

    res.json({
      userId: req.params.userId,
      followers: followerResult.data,
      totalFollowers: profile.followers || 0,
      limit: listOptions.limit,
      nextCursor: followerResult.nextCursor,
      hasMore: followerResult.hasMore,
    });
  } catch (error) {
    console.error(error);

    if (error.message.startsWith("Invalid ")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to fetch followers" });
  }
};

const getFollowing = async (req, res) => {
  try {
    const profile = await profileModel.getProfileByUserId(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const listOptions = parseListOptions(req.query);
    const followingResult = await followModel.getFollowingUserIds(
      req.params.userId,
      listOptions,
    );

    res.json({
      userId: req.params.userId,
      following: followingResult.data,
      totalFollowing: profile.following || 0,
      limit: listOptions.limit,
      nextCursor: followingResult.nextCursor,
      hasMore: followingResult.hasMore,
    });
  } catch (error) {
    console.error(error);

    if (error.message.startsWith("Invalid ")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to fetch following" });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
};
