const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const uri = process.env.ATLAS_URI;
if (!uri) {
  throw new Error("Missing ATLAS_URI environment variable");
}

const client = new MongoClient(uri);
const databaseName = process.env.DB_NAME || "myDatabase";
let db;

const connectToDatabase = async () => {
  if (db) {
    return db;
  }

  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(databaseName);
    console.log(`Using database: ${databaseName}`);
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

module.exports = { connectToDatabase };
