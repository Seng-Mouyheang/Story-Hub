const { connectToDatabase } = require("../configuration/dbConfig");

const COLLECTION_NAME = "revokedTokens";
let indexesEnsured = false;

const getCollection = async () => {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  if (!indexesEnsured) {
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
    indexesEnsured = true;
  }

  return collection;
};

const revokeToken = async ({ tokenHash, userId, expiresAt }) => {
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
    { upsert: true },
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
