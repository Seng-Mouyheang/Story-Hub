const path = require("node:path");
const { MongoClient } = require("mongodb");
const {
  ensureUserEmailBackfillAndDedup,
  ensureNormalizedUniqueUserEmailIndex,
} = require("../migrations/userEmailMigration");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

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

    await db.collection("confessions").createIndex(
      { createdAt: -1, _id: -1 },
      {
        name: "confession_feed_created_cursor_index",
        partialFilterExpression: {
          visibility: "public",
          deletedAt: null,
        },
      },
    );

    await db
      .collection("confessions")
      .createIndex(
        { authorId: 1, updatedAt: -1, _id: -1 },
        { name: "confession_author_dashboard_index" },
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

    await db.collection("confessions").createIndex(
      { deletedAt: 1 },
      {
        name: "confessions_deletedAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 30,
        partialFilterExpression: { deletedAt: { $type: "date" } },
      },
    );

    // For Hard delete Testing
    // await db.collection("storyComments").dropIndex("deletedAt_1").catch(() => {});

    // Create TTL index on storyComments collection (Soft delete 7 days)
    await db.collection("storyComments").createIndex(
      { deletedAt: 1 },
      {
        name: "storyComments_deletedAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 7,
        partialFilterExpression: { deletedAt: { $type: "date" } },
      },
    );

    await db.collection("confessionComments").createIndex(
      { deletedAt: 1 },
      {
        name: "confessionComments_deletedAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 7,
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

    // For fetching likes count per story quickly
    await db
      .collection("storyLikes")
      .createIndex({ storyId: 1 }, { name: "storyId_lookup_index" });

    await db
      .collection("confessionLikes")
      .createIndex(
        { userId: 1, confessionId: 1 },
        { unique: true, name: "unique_user_confession_like" },
      );

    await db
      .collection("confessionLikes")
      .createIndex(
        { confessionId: 1 },
        { name: "confessionId_like_lookup_index" },
      );

    // Unique index to prevent duplicate bookmarks by the same user
    await db
      .collection("storyBookmarks")
      .createIndex(
        { userId: 1, storyId: 1 },
        { unique: true, name: "unique_user_story_bookmark" },
      );

    // Cursor index for current user's bookmark feed
    await db
      .collection("storyBookmarks")
      .createIndex(
        { userId: 1, createdAt: -1, _id: -1 },
        { name: "user_bookmark_cursor_index" },
      );

    // Fast lookup by story for optional future analytics/features
    await db
      .collection("storyBookmarks")
      .createIndex({ storyId: 1 }, { name: "bookmark_storyId_lookup_index" });

    await db
      .collection("confessionBookmarks")
      .createIndex(
        { userId: 1, confessionId: 1 },
        { unique: true, name: "unique_user_confession_bookmark" },
      );

    await db
      .collection("confessionBookmarks")
      .createIndex(
        { userId: 1, createdAt: -1, _id: -1 },
        { name: "confession_user_bookmark_cursor_index" },
      );

    await db
      .collection("confessionBookmarks")
      .createIndex(
        { confessionId: 1 },
        { name: "bookmark_confessionId_lookup_index" },
      );

    // Prevent duplicate follows for the same follower-following pair
    await db
      .collection("follows")
      .createIndex(
        { followerId: 1, followingId: 1 },
        { unique: true, name: "unique_follower_following_pair" },
      );

    // Support quick lookup of users who follow a target user
    await db
      .collection("follows")
      .createIndex(
        { followingId: 1, _id: -1 },
        { name: "followers_lookup_index" },
      );

    // Support quick lookup of users followed by a specific user
    await db
      .collection("follows")
      .createIndex(
        { followerId: 1, _id: -1 },
        { name: "following_lookup_index" },
      );

    // For fetching comments per story quickly
    await db.collection("storyComments").createIndex({
      storyId: 1,
      parentId: 1,
      deletedAt: 1,
      createdAt: -1,
      _id: -1,
    });

    await db.collection("confessionComments").createIndex({
      confessionId: 1,
      parentId: 1,
      deletedAt: 1,
      createdAt: -1,
      _id: -1,
    });

    // For replies comments
    await db
      .collection("storyComments")
      .createIndex({ parentId: 1, deletedAt: 1, createdAt: 1, _id: 1 });

    await db
      .collection("confessionComments")
      .createIndex({ parentId: 1, deletedAt: 1, createdAt: 1, _id: 1 });

    // For fetching user comments quickly
    await db.collection("storyComments").createIndex({ userId: 1 });

    await db.collection("confessionComments").createIndex({ userId: 1 });

    // Optional: prevent duplicate likes per user (if comment likes implemented)
    await db
      .collection("commentLikes")
      .createIndex({ userId: 1, commentId: 1 }, { unique: true });

    await db
      .collection("confessionCommentLikes")
      .createIndex({ userId: 1, commentId: 1 }, { unique: true });

    // Unique index to prevent duplicate active profiles for the same user
    await db.collection("profiles").createIndex(
      { userId: 1 },
      {
        unique: true,
        name: "unique_user_profile",
        partialFilterExpression: { deletedAt: null },
      },
    );

    // TTL index to permanently remove soft-deleted user accounts after 30 days.
    await db.collection("users").createIndex(
      { deletedAt: 1 },
      {
        name: "users_deletedAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 30,
        partialFilterExpression: { deletedAt: { $type: "date" } },
      },
    );

    // TTL index to permanently remove soft-deleted profiles after 30 days.
    await db.collection("profiles").createIndex(
      { deletedAt: 1 },
      {
        name: "profiles_deletedAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 30,
        partialFilterExpression: { deletedAt: { $type: "date" } },
      },
    );

    // One-off safety backfill for historical users before enforcing uniqueness.
    await ensureUserEmailBackfillAndDedup(db);

    // Prevent duplicate active user accounts with the same normalized email.
    await ensureNormalizedUniqueUserEmailIndex(db);

    console.log(`Using database: ${databaseName}`);
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

const getClient = () => client;

module.exports = { connectToDatabase, getClient };
