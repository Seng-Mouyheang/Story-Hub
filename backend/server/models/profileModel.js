const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "profiles";

const PROTECTED_FIELDS = [
  "_id",
  "userId",
  "posts",
  "followers",
  "following",
  "createdAt",
  "deletedAt",
];

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

/**
 * Create user profile
 * @param {string} userId
 * @param {Object} profileData
 */

const createProfile = async (userId, profileData) => {
  const collection = await getCollection();

  const existingProfile = await collection.findOne({ userId, deletedAt: null });
  if (existingProfile) {
    throw new Error("Profile already exists");
  }

  const newProfile = {
    _id: new ObjectId(),
    userId,
    displayName: profileData.displayName,
    bio: profileData.bio || "",
    interest: profileData.interest || [],
    posts: 0,
    followers: 0,
    following: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const result = await collection.insertOne(newProfile);
  return result.insertedId;
};

/**
 * Get user profile by userId
 * @param {string} userId
 * @returns {Object}
 */
const getProfileByUserId = async (userId) => {
  const collection = await getCollection();
  return await collection.findOne({ userId, deletedAt: null });
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} profileData
 */
const updateProfile = async (userId, profileData) => {
  const collection = await getCollection();

  const existingProfile = await collection.findOne({ userId, deletedAt: null });

  if (!existingProfile) {
    throw new Error("Profile not found");
  }

  if (existingProfile.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized to update this profile");
  }

  const sanitizedProfileData = { ...profileData };

  PROTECTED_FIELDS.forEach((field) => {
    if (field in sanitizedProfileData) {
      delete sanitizedProfileData[field];
    }
  });

  const updateFields = { updatedAt: new Date() };

  if (Object.hasOwn(sanitizedProfileData, "displayName")) {
    updateFields.displayName = sanitizedProfileData.displayName;
  }

  if (Object.hasOwn(sanitizedProfileData, "bio")) {
    updateFields.bio = sanitizedProfileData.bio;
  }

  if (Object.hasOwn(sanitizedProfileData, "interest")) {
    updateFields.interest = sanitizedProfileData.interest;
  }

  if (Object.hasOwn(sanitizedProfileData, "profilePicture")) {
    updateFields.profilePicture = sanitizedProfileData.profilePicture;
  }

  await collection.updateOne(
    { userId, deletedAt: null },
    { $set: updateFields },
  );
};

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
};
