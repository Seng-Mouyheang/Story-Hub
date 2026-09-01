const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

const COLLECTION_NAME = "momentViews";

// Records the first time a user views a moment. Uses $setOnInsert so a
// repeat view (e.g. navigating back and forth in the viewer) doesn't bump
// viewedAt — the viewers list should reflect when someone first saw it.
const recordView = async (momentId, viewerId) => {
  const db = await connectToDatabase();

  try {
    await db.collection(COLLECTION_NAME).updateOne(
      { momentId: new ObjectId(momentId), userId: new ObjectId(viewerId) },
      {
        $setOnInsert: {
          momentId: new ObjectId(momentId),
          userId: new ObjectId(viewerId),
          viewedAt: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Two concurrent first-views (e.g. the same story open in two tabs) can
    // both miss the initial match and race to insert — the unique index on
    // (userId, momentId) then rejects the loser with E11000. The winner
    // already recorded the view, so this is a no-op, not a failure.
    if (error.code !== 11000) {
      throw error;
    }
  }
};

// Paginated list of a moment's viewers, most recent first, each flagged
// with whether they also liked the moment (mirrors Instagram's viewers
// list, which surfaces likers with a heart badge).
const getMomentViewers = async (momentId, limit = 20, cursor = null) => {
  const db = await connectToDatabase();
  const momentObjectId = new ObjectId(momentId);

  // Bounded here regardless of what the caller passes in — the innermost
  // defense against an unbounded/malformed $limit reaching MongoDB, not
  // just whatever validation happened upstream.
  const boundedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const matchStage = { momentId: momentObjectId };

  if (typeof cursor === "string" && cursor.includes("_")) {
    const [viewedAtStr, id] = cursor.split("_");

    if (viewedAtStr && id && ObjectId.isValid(id)) {
      const viewedAtDate = new Date(viewedAtStr);

      if (!Number.isNaN(viewedAtDate.getTime())) {
        matchStage.$or = [
          { viewedAt: { $lt: viewedAtDate } },
          { viewedAt: viewedAtDate, _id: { $lt: new ObjectId(id) } },
        ];
      }
    }
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { viewedAt: -1, _id: -1 } },
    { $limit: boundedLimit + 1 },
    {
      $lookup: {
        from: "profiles",
        let: { uid: "$userId" },
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
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "momentLikes",
        let: { uid: "$userId", mid: "$momentId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$uid"] },
                  { $eq: ["$momentId", "$$mid"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "likeDoc",
      },
    },
  ];

  const rows = await db
    .collection(COLLECTION_NAME)
    .aggregate(pipeline)
    .toArray();

  const hasMore = rows.length > boundedLimit;
  const data = hasMore ? rows.slice(0, boundedLimit) : rows;

  const viewers = data.map((row) => ({
    userId: row.userId.toString(),
    displayName: row.profile?.displayName || "",
    profilePicture: row.profile?.profilePicture || "",
    viewedAt: row.viewedAt,
    liked: row.likeDoc.length > 0,
  }));

  let nextCursor = null;

  if (hasMore) {
    const last = data[data.length - 1];
    nextCursor = `${last.viewedAt.toISOString()}_${last._id}`;
  }

  return { viewers, nextCursor, hasMore };
};

const getMomentViewsCount = async (momentId) => {
  const db = await connectToDatabase();
  return db
    .collection(COLLECTION_NAME)
    .countDocuments({ momentId: new ObjectId(momentId) });
};

module.exports = {
  recordView,
  getMomentViewers,
  getMomentViewsCount,
};
