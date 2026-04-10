const { connectToDatabase } = require("../../configuration/dbConfig");

const COLLECTION_NAME = "revokedTokens";
let indexesEnsuredPromise = null;

const getCollection = async () => {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  if (!indexesEnsuredPromise) {
    indexesEnsuredPromise = (async () => {
      await collection.createIndex(
        { tokenHash: 1 },
        { unique: true, name: "unique_token_hash" },
      );
      await collection.createIndex(
        { expiresAt: 1 },
        {
          name: "revoked_token_expiry_ttl",
          expireAfterSeconds: 0,
          partialFilterExpression: { expiresAt: { $type: "date" } },
        },
      );
      await collection.createIndex(
        { userId: 1 },
        { name: "revoked_token_user_idx" },
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

const revokeToken = async ({ tokenHash, userId, expiresAt }, options = {}) => {
  const collection = await getCollection();

  await collection.updateOne(
    { tokenHash },
    {
      $set: {
        tokenHash,
        userId,
        expiresAt,
      },
      $setOnInsert: {
        revokedAt: new Date(),
      },
    },
    { upsert: true, session: options.session },
  );
};

const isTokenRevoked = async (tokenHash) => {
  const collection = await getCollection();
  const token = await collection.findOne(
    { tokenHash },
    { projection: { _id: 1 } },
  );
  return Boolean(token);
};

module.exports = {
  revokeToken,
  isTokenRevoked,
};
