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

const REGEX_SPECIAL_CHARACTERS = new Set([
  "\\",
  "^",
  "$",
  ".",
  "|",
  "?",
  "*",
  "+",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
]);

const escapeRegex = (value) =>
  [...value]
    .map((character) =>
      REGEX_SPECIAL_CHARACTERS.has(character) ? `\\${character}` : character,
    )
    .join("");

const applyFollowCountDelta = async (userId, field, delta, options = {}) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  if (!["followers", "following"].includes(field)) {
    throw new Error("Invalid profile follow field");
  }

  const collection = await getCollection();
  const updatePipeline = [
    {
      $set: {
        [field]: {
          $max: [0, { $add: [{ $ifNull: [`$${field}`, 0] }, delta] }],
        },
        updatedAt: new Date(),
      },
    },
  ];

  const result = await collection.updateOne(
    {
      userId: new ObjectId(userId),
      deletedAt: null,
    },
    updatePipeline,
    { session: options.session },
  );

  if (!result.matchedCount) {
    throw new Error("Profile not found");
  }
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

const searchProfilesByUsernameOrDisplayName = async (query, limit = 20) => {
  const collection = await getCollection();
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const escapedQuery = escapeRegex(trimmedQuery);

  const pipeline = [
    {
      $match: {
        deletedAt: null,
      },
    },
    {
      $lookup: {
        from: "users",
        let: { profileUserId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$profileUserId"] },
              deletedAt: null,
            },
          },
          {
            $project: {
              username: 1,
            },
          },
        ],
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        $or: [
          { "user.username": { $regex: escapedQuery, $options: "i" } },
          { displayName: { $regex: escapedQuery, $options: "i" } },
        ],
      },
    },
    {
      $addFields: {
        relevanceScore: {
          $add: [
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$user.username",
                    regex: `^${escapedQuery}$`,
                    options: "i",
                  },
                },
                100,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$user.username",
                    regex: `^${escapedQuery}`,
                    options: "i",
                  },
                },
                70,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$displayName",
                    regex: `^${escapedQuery}$`,
                    options: "i",
                  },
                },
                60,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$displayName",
                    regex: `^${escapedQuery}`,
                    options: "i",
                  },
                },
                40,
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        relevanceScore: -1,
        followers: -1,
        createdAt: 1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 0,
        userId: 1,
        username: "$user.username",
        displayName: 1,
        bio: 1,
        interest: 1,
        profilePicture: 1,
        followers: 1,
        following: 1,
      },
    },
  ];

  return collection.aggregate(pipeline).toArray();
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

const incrementFollowers = async (userId, options = {}) =>
  applyFollowCountDelta(userId, "followers", 1, options);

const decrementFollowers = async (userId, options = {}) =>
  applyFollowCountDelta(userId, "followers", -1, options);

const incrementFollowing = async (userId, options = {}) =>
  applyFollowCountDelta(userId, "following", 1, options);

const decrementFollowing = async (userId, options = {}) =>
  applyFollowCountDelta(userId, "following", -1, options);

const softDeleteProfileByUserId = async (userId, options = {}) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const collection = await getCollection();
  const deletedAt = new Date();
  const result = await collection.updateOne(
    {
      userId: new ObjectId(userId),
      deletedAt: null,
    },
    {
      $set: {
        deletedAt,
        updatedAt: deletedAt,
      },
    },
    { session: options.session },
  );

  return result;
};

const restoreProfileByUserId = async (userId, options = {}) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const collection = await getCollection();
  const result = await collection.updateOne(
    {
      userId: new ObjectId(userId),
      deletedAt: { $ne: null },
    },
    {
      $set: {
        deletedAt: null,
        updatedAt: new Date(),
      },
    },
    { session: options.session },
  );

  return result;
};

module.exports = {
  createProfile,
  getProfileByUserId,
  searchProfilesByUsernameOrDisplayName,
  updateProfile,
  incrementFollowers,
  decrementFollowers,
  incrementFollowing,
  decrementFollowing,
  softDeleteProfileByUserId,
  restoreProfileByUserId,
};
