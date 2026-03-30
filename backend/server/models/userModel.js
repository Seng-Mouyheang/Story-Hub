const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");
const { normalizeEmail } = require("../utils/email");

const COLLECTION_NAME = "users";

const setNormalizedEmail = (userData) => {
  return {
    ...userData,
    email: normalizeEmail(userData.email),
  };
};

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

/**
 * Create a new user
 * @param {Object} userData
 * @returns {Promise<ObjectId>}
 */

const createUser = async (userData) => {
  const collection = await getCollection();
  const normalizedUserData = setNormalizedEmail(userData);

  const user = {
    username: normalizedUserData.username,
    email: normalizedUserData.email,
    password: normalizedUserData.password, // hash later
    role: normalizedUserData.role || "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const result = await collection.insertOne(user);
  return result.insertedId;
};

/**
 * Find user by email (used for login)
 * @param {string} email
 */
const findUserByEmail = async (email) => {
  const collection = await getCollection();
  return collection.findOne({
    email: normalizeEmail(email),
    deletedAt: null,
  });
};

/**
 * Find user by ID
 * @param {string} id
 */
const findUserById = async (id) => {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
};

/**
 * Delete user by ID (used for signup rollback)
 * @param {string|ObjectId} id
 */
const deleteUserById = async (id) => {
  const collection = await getCollection();
  if (typeof id === "string" && !ObjectId.isValid(id)) {
    throw new Error("Invalid user id");
  }
  const userId = typeof id === "string" ? new ObjectId(id) : id;
  const result = await collection.deleteOne({ _id: userId });
  if (result.deletedCount !== 1) {
    throw new Error("Rollback delete did not remove a user");
  }
  return result;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  deleteUserById,
  setNormalizedEmail,
};
