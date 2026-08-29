const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "moments";
const PROFILES_COLLECTION = "profiles";
const MOMENT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MOMENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_BACKGROUND_COLOR = "#0f172a";

const assertValidObjectId = (id, fieldName) => {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }
};

const mapMoment = (moment, viewerObjectId) => ({
  id: moment._id.toString(),
  type: moment.type,
  imageUrl: moment.imageUrl || null,
  text: moment.text || null,
  backgroundColor: moment.backgroundColor || null,
  createdAt: moment.createdAt,
  expiresAt: moment.expiresAt,
  viewed: viewerObjectId
    ? moment.viewedBy.some((id) => id.equals(viewerObjectId))
    : false,
});

const createMoment = async ({
  authorId,
  type,
  imageUrl = null,
  imageFileKey = null,
  text = null,
  backgroundColor = null,
}) => {
  assertValidObjectId(authorId, "author id");

  const db = await connectToDatabase();
  const now = new Date();

  const result = await db.collection(COLLECTION_NAME).insertOne({
    authorId: new ObjectId(authorId),
    type,
    imageUrl: type === "image" ? imageUrl : null,
    // The customId this image was uploaded under, verified as owned by
    // `authorId` by the controller before calling this — kept so the
    // retention cleanup job can delete the UploadThing file by an
    // authoritative id rather than trusting a client-supplied URL.
    imageFileKey: type === "image" ? imageFileKey : null,
    text: type === "text" ? text : null,
    backgroundColor:
      type === "text" ? backgroundColor || DEFAULT_BACKGROUND_COLOR : null,
    viewedBy: [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + MOMENT_LIFETIME_MS),
  });

  return result.insertedId.toString();
};

const getFeedMoments = async (viewerId, authorIds) => {
  assertValidObjectId(viewerId, "viewer id");

  const authorObjectIds = authorIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (authorObjectIds.length === 0) {
    return [];
  }

  const db = await connectToDatabase();
  const viewerObjectId = new ObjectId(viewerId);
  const now = new Date();

  const groups = await db
    .collection(COLLECTION_NAME)
    .aggregate([
      {
        $match: {
          authorId: { $in: authorObjectIds },
          expiresAt: { $gt: now },
          pendingDeletion: { $ne: true },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$authorId",
          latestCreatedAt: { $max: "$createdAt" },
          moments: { $push: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: PROFILES_COLLECTION,
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$uid"] },
                deletedAt: null,
              },
            },
            { $project: { _id: 0, displayName: 1, profilePicture: 1 } },
          ],
          as: "profile",
        },
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ["$profile", 0] },
          hasUnseen: {
            $anyElementTrue: {
              $map: {
                input: "$moments",
                as: "moment",
                in: { $not: [{ $in: [viewerObjectId, "$$moment.viewedBy"] }] },
              },
            },
          },
        },
      },
      { $sort: { hasUnseen: -1, latestCreatedAt: -1 } },
    ])
    .toArray();

  return groups.map((group) => ({
    authorId: group._id.toString(),
    name: group.profile?.displayName || "",
    image: group.profile?.profilePicture || "",
    hasUnseen: Boolean(group.hasUnseen),
    latestCreatedAt: group.latestCreatedAt,
    moments: group.moments.map((moment) => mapMoment(moment, viewerObjectId)),
  }));
};

const getMomentsByAuthor = async (authorId, viewerId = null) => {
  assertValidObjectId(authorId, "author id");

  const db = await connectToDatabase();
  const authorObjectId = new ObjectId(authorId);
  const now = new Date();

  const [moments, profile] = await Promise.all([
    db
      .collection(COLLECTION_NAME)
      .find({
        authorId: authorObjectId,
        expiresAt: { $gt: now },
        pendingDeletion: { $ne: true },
      })
      .sort({ createdAt: 1 })
      .toArray(),
    db
      .collection(PROFILES_COLLECTION)
      .findOne(
        { userId: authorObjectId, deletedAt: null },
        { projection: { displayName: 1, profilePicture: 1 } },
      ),
  ]);

  const viewerObjectId =
    viewerId && ObjectId.isValid(viewerId) ? new ObjectId(viewerId) : null;

  return {
    authorId,
    name: profile?.displayName || "",
    image: profile?.profilePicture || "",
    moments: moments.map((moment) => mapMoment(moment, viewerObjectId)),
  };
};

const markViewed = async (momentId, viewerId) => {
  assertValidObjectId(momentId, "story id");
  assertValidObjectId(viewerId, "viewer id");

  const db = await connectToDatabase();

  await db.collection(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(momentId),
      expiresAt: { $gt: new Date() },
      pendingDeletion: { $ne: true },
    },
    { $addToSet: { viewedBy: new ObjectId(viewerId) } },
  );
};

// Marks the moment for deletion (immediately excluded from feeds/profile
// views via the `pendingDeletion` filter) rather than hard-deleting it here.
// The caller must delete the UploadThing file first and only then call
// `hardDeleteMomentById` — if that file deletion fails, the moment stays in
// this pending state, and `findMomentsPastRetention` will pick it up (it
// matches on `pendingDeletion` regardless of age) so the retry isn't lost.
const deleteMoment = async (momentId, authorId) => {
  assertValidObjectId(momentId, "story id");
  assertValidObjectId(authorId, "author id");

  const db = await connectToDatabase();

  const markedMoment = await db.collection(COLLECTION_NAME).findOneAndUpdate(
    {
      _id: new ObjectId(momentId),
      authorId: new ObjectId(authorId),
      // Excludes an already-marked moment so a duplicate/concurrent delete
      // request (double-click, client retry) can't also match and trigger
      // a second, redundant finalizeMomentDeletion for the same file.
      pendingDeletion: { $ne: true },
    },
    { $set: { pendingDeletion: true } },
    { projection: { type: 1, imageUrl: 1, imageFileKey: 1 } },
  );

  return markedMoment;
};

const hardDeleteMomentById = async (momentId) => {
  const db = await connectToDatabase();
  await db.collection(COLLECTION_NAME).deleteOne({ _id: momentId });
};

// Sorted + cursor-paginated (rather than always re-querying the same top N)
// so a run keeps advancing past moments whose file deletion failed instead
// of re-fetching and re-attempting the same stuck page forever, which would
// starve later, unrelated moments in the backlog of ever being attempted.
//
// Matches on `pendingDeletion` in addition to the age cutoff so a moment
// whose manual-delete file cleanup failed (see deleteMoment above) gets
// retried on the next run rather than waiting out the full 7 days.
const findMomentsPastRetention = async (limit, afterId = null) => {
  const db = await connectToDatabase();
  const cutoff = new Date(Date.now() - MOMENT_RETENTION_MS);

  const filter = {
    $or: [{ createdAt: { $lt: cutoff } }, { pendingDeletion: true }],
  };
  if (afterId) {
    filter._id = { $gt: afterId };
  }

  return db
    .collection(COLLECTION_NAME)
    .find(filter)
    .sort({ _id: 1 })
    .project({ imageUrl: 1, imageFileKey: 1 })
    .limit(limit)
    .toArray();
};

const hardDeleteMoments = async (momentIds) => {
  if (momentIds.length === 0) {
    return 0;
  }

  const db = await connectToDatabase();
  const result = await db.collection(COLLECTION_NAME).deleteMany({
    _id: { $in: momentIds },
  });

  return result.deletedCount;
};

module.exports = {
  createMoment,
  getFeedMoments,
  getMomentsByAuthor,
  markViewed,
  deleteMoment,
  hardDeleteMomentById,
  findMomentsPastRetention,
  hardDeleteMoments,
};
