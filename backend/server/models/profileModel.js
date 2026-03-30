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
 * @param {Object} options - Optional configuration object
 * @param {Object} options.session - MongoDB session for transactions
 */

const createProfile = async (userId, profileData, options = {}) => {
  const collection = await getCollection();
  const userObjectId = new ObjectId(userId);

  const existingProfile = await collection.findOne(
    {
      userId: userObjectId,
      deletedAt: null,
    },
    { session: options.session },
  );
  if (existingProfile) {
    throw new Error("Profile already exists");
  }

  const newProfile = {
    _id: new ObjectId(),
    userId: userObjectId,
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

  try {
    const result = await collection.insertOne(newProfile, {
      session: options.session,
    });
    return result.insertedId;
  } catch (error) {
    // Handle race conditions where two requests pass pre-check simultaneously.
    if (error?.code === 11000) {
      throw new Error("Profile already exists", { cause: error });
    }
    throw error;
  }
};

/**
 * Get user profile by userId
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getProfileByUserId = async (userId) => {
  const collection = await getCollection();
  if (!ObjectId.isValid(userId)) return null;

  return await collection.findOne({
    userId: new ObjectId(userId),
    deletedAt: null,
  });
};

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} profileData
 */
const updateProfile = async (userId, profileData) => {
  const collection = await getCollection();
  const userObjectId = new ObjectId(userId);

  const existingProfile = await collection.findOne({
    userId: userObjectId,
    deletedAt: null,
  });

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
    { userId: userObjectId, deletedAt: null },
    { $set: updateFields },
  );
};

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
};
