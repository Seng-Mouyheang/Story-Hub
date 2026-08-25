const { connectToDatabase } = require("../../configuration/dbConfig");

const COLLECTION_NAME = "uploadOwnership";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
let indexesEnsuredPromise = null;

const getCollection = async () => {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  if (!indexesEnsuredPromise) {
    indexesEnsuredPromise = (async () => {
      await collection.createIndex(
        { fileKey: 1 },
        { unique: true, name: "unique_file_key" },
      );
      await collection.createIndex(
        { createdAt: 1 },
        {
          name: "upload_ownership_ttl",
          expireAfterSeconds: TTL_SECONDS,
        },
      );
    })().catch((err) => {
      // Allow a retry on the next call if index creation fails
      indexesEnsuredPromise = null;
      throw err;
    });
  }

  await indexesEnsuredPromise;
  return collection;
};

// First-claim-wins: insertOne (not upsert) so a record can never be
// overwritten with a different owner once set — e.g. by a second, spoofed
// "confirm ownership" call for a fileKey someone else already claimed.
// Duplicate calls for the same legitimately-owned file (e.g. both the
// upload webhook and the frontend's own confirmation firing) are expected
// and just no-op.
const recordUpload = async (fileKey, userId) => {
  const collection = await getCollection();

  try {
    await collection.insertOne({ fileKey, userId, createdAt: new Date() });
  } catch (error) {
    if (error?.code === 11000) {
      return;
    }
    throw error;
  }
};

const isOwner = async (fileKey, userId) => {
  const collection = await getCollection();
  const record = await collection.findOne(
    { fileKey, userId },
    { projection: { _id: 1 } },
  );
  return Boolean(record);
};

const removeRecord = async (fileKey) => {
  const collection = await getCollection();
  await collection.deleteOne({ fileKey });
};

module.exports = { recordUpload, isOwner, removeRecord };
