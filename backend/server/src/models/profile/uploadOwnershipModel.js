const { connectToDatabase } = require("../../configuration/dbConfig");

const COLLECTION_NAME = "uploadOwnership";
let indexesEnsuredPromise = null;

const getCollection = async () => {
  const db = await connectToDatabase();
  const collection = db.collection(COLLECTION_NAME);

  if (!indexesEnsuredPromise) {
    indexesEnsuredPromise = (async () => {
      await collection.createIndex(
        { customId: 1 },
        { unique: true, name: "unique_custom_id" },
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

/**
 * Records that `userId` is the owner of `customId` — called once, from
 * `.middleware()` in uploadThingRoute.js, at the moment an authenticated
 * user is granted a presigned upload slot (before any bytes are uploaded).
 * This is the sole, authoritative point where ownership is established;
 * nothing downstream ever takes a client's word for who owns a file.
 * No expiry: the record is only ever consulted for files that were never
 * saved to a profile (see profileController.deleteUpload) and is removed
 * once that file is deleted or the upload is abandoned in favor of a
 * newer one, so it never outlives the file it describes.
 */
const recordUpload = async (customId, userId) => {
  const collection = await getCollection();
  await collection.insertOne({ customId, userId, createdAt: new Date() });
};

const isOwner = async (customId, userId) => {
  const collection = await getCollection();
  const record = await collection.findOne(
    { customId, userId },
    { projection: { _id: 1 } },
  );
  return Boolean(record);
};

const removeRecord = async (customId) => {
  const collection = await getCollection();
  await collection.deleteOne({ customId });
};

/**
 * Atomically verifies ownership and consumes the record in one operation,
 * closing the check-then-act window a separate isOwner + removeRecord pair
 * would leave open (two concurrent callers both passing the check before
 * either removes it). Returns the claimed record, or null if `userId`
 * doesn't own `customId`.
 */
const claimRecord = async (customId, userId) => {
  const collection = await getCollection();
  return collection.findOneAndDelete({ customId, userId });
};

/**
 * Records the file's real URL once uploadthing's `onUploadComplete` reports
 * it — the only server-trustworthy source, since the client could otherwise
 * claim ownership of a customId it legitimately holds while asserting an
 * unrelated URL (e.g. someone else's image) alongside it.
 */
const attachFileUrl = async (customId, url) => {
  const collection = await getCollection();
  await collection.updateOne({ customId }, { $set: { url } });
};

module.exports = {
  recordUpload,
  isOwner,
  removeRecord,
  claimRecord,
  attachFileUrl,
};
