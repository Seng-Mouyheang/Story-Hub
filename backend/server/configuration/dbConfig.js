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

    // Ensure indexes (safe to run multiple times)
    await db.collection("stories").createIndex(
      { publishedAt: -1, _id: -1 },
      {
        name: "published_cursor_index",
        partialFilterExpression: {
          status: "published",
          visibility: "public",
          deletedAt: null,
        },
      },
    );

    // Index for author dashboard (sort by updatedAt desc, then _id desc)
    await db
      .collection("stories")
      .createIndex(
        { authorId: 1, updatedAt: -1, _id: -1 },
        { name: "author_dashboard_index" },
      );

    // For Hard delete Testing
    // await db.collection("stories").dropIndex("deletedAt_1").catch(() => {});

    // Create TTL index on stories collection (Hard delete 30 days)
    await db.collection("stories").createIndex(
      { deletedAt: 1 },
      {
        expireAfterSeconds: 60 * 60 * 24 * 30,
        partialFilterExpression: { deletedAt: { $type: "date" } },
      },
    );

    // Unique index to prevent duplicate likes by the same user on the same story
    await db
      .collection("storyLikes")
      .createIndex(
        { userId: 1, storyId: 1 },
        { unique: true, name: "unique_user_story_like" },
      );
    
    await db.collection("storyLikes").createIndex(
      { storyId: 1 },
      { name: "storyId_lookup_index" }
    );

    console.log(`Using database: ${databaseName}`);
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const getClient = () => client;

module.exports = { connectToDatabase, getClient };
