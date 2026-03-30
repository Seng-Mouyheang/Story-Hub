const profileModel = require("../models/profileModel");

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

module.exports = {
  getProfile,
  updateProfile,
};
