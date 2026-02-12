const { connectToDatabase } = require("../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "users";

const getCollection = async () => {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
};

/**
 * Create a new user
 * @param {Object} userData
 * @returns {ObjectId}
 */

const createUser = async (userData) => {
  const collection = await getCollection();

  const user = {
    username: userData.username,
    email: userData.email,
    password: userData.password, // hash later
    role: userData.role || "user",
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
  return collection.findOne({ email });
};

/**
 * Find user by ID
 * @param {string} id
 */
const findUserById = async (id) => {
  const collection = await getCollection();
  return collection.findOne({ _id: new ObjectId(id) });
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
