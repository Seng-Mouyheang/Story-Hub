const momentModel = require("../../models/moment/momentModel");
const momentViewModel = require("../../models/moment/momentViewModel");
const followModel = require("../../models/profile/followModel");
const uploadOwnershipModel = require("../../models/profile/uploadOwnershipModel");
const {
  deleteMomentFileWithRetry,
} = require("../../services/momentMediaCleanupService");

// Deletes the file first (retrying the same as the retention job) and only
// hard-deletes the moment doc once that succeeds — never awaited on the
// response path. On failure the moment stays `pendingDeletion` (already
// invisible to feeds), and the retention job's next run retries it.
const finalizeMomentDeletion = async (moment) => {
  const fileDeleted = await deleteMomentFileWithRetry(moment);

  if (fileDeleted) {
    await momentModel.hardDeleteMomentById(moment._id);
  }
};

const getAllFollowingIds = async (userId) => {
  const ids = [];
  let cursor = null;

  for (;;) {
    const { data, nextCursor, hasMore } = await followModel.getFollowingUserIds(
      userId,
      { cursor, limit: 200 },
    );
    ids.push(...data);

    if (!hasMore) break;
    cursor = nextCursor;
  }

  return ids;
};

const createMoment = async (req, res) => {
  const { type, text, backgroundColor, imageFileKey } = req.body;
  let claimedRecord = null;

  try {
    let verifiedImageUrl = null;

    if (type === "image") {
      // Atomically verify + consume the ownership record in one operation,
      // rather than a separate check followed by a later removal — the gap
      // between those two steps would let two concurrent requests for the
      // same imageFileKey both pass the check before either removed it,
      // producing two moments backed by one file (deleting one later would
      // break the other's image).
      claimedRecord = await uploadOwnershipModel.claimRecord(
        imageFileKey,
        req.user.userId,
      );

      if (!claimedRecord) {
        return res.status(403).json({ message: "You do not own this image" });
      }

      // Never trust the client's own imageUrl for what gets displayed —
      // owning imageFileKey only proves the user owns *some* file with that
      // customId, not that imageUrl points at it. Use the URL uploadthing's
      // onUploadComplete recorded server-side for this exact customId
      // instead (see uploadThingRoute.js).
      if (!claimedRecord.url) {
        throw new Error("Upload is missing its recorded file URL");
      }
      verifiedImageUrl = claimedRecord.url;
    }

    const momentId = await momentModel.createMoment({
      authorId: req.user.userId,
      type,
      text,
      backgroundColor,
      imageUrl: verifiedImageUrl,
      imageFileKey: type === "image" ? imageFileKey : null,
    });

    res.status(201).json({ momentId });
  } catch (error) {
    console.error(error);

    if (claimedRecord) {
      // Moment persistence failed after the claim succeeded — restore the
      // exact claimed document (not a freshly reconstructed one, which
      // would drop its `url`) so the upload isn't left permanently unowned.
      uploadOwnershipModel
        .restoreRecord(claimedRecord)
        .catch((restoreError) => {
          console.error(
            "Failed to restore upload ownership record:",
            restoreError,
          );
        });
    }

    res.status(500).json({ message: "Failed to post story" });
  }
};

const getFeedMoments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const followingIds = await getAllFollowingIds(userId);
    const authorIds = [...new Set([userId, ...followingIds])];

    const groups = await momentModel.getFeedMoments(userId, authorIds);

    res.json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load stories" });
  }
};

const getMomentsByAuthor = async (req, res) => {
  try {
    const group = await momentModel.getMomentsByAuthor(
      req.params.id,
      req.user?.userId || null,
    );

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load story" });
  }
};

const viewMoment = async (req, res) => {
  try {
    await momentModel.markViewed(req.params.id, req.user.userId);
    res.json({ viewed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update story" });
  }
};

// Get who has viewed a story, with a `liked` flag on each — author only.
const getMomentViewers = async (req, res) => {
  try {
    // Ownership is part of the query itself, so a wrong-owner request 404s
    // exactly like a nonexistent one — no separate check to accidentally
    // omit, and no way to tell "not yours" apart from "doesn't exist".
    const moment = await momentModel.getMomentOwnedByAuthor(
      req.params.id,
      req.user.userId,
    );

    if (!moment) {
      return res.status(404).json({ message: "Story not found" });
    }

    const cursor = req.query.cursor || null;
    // req.query is read-only in Express 5, so the validate middleware's
    // Joi-coerced value never actually lands on it — re-parse here rather
    // than trust req.query.limit's type (see getComments/getReplies).
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const [result, totalCount] = await Promise.all([
      momentViewModel.getMomentViewers(req.params.id, limit, cursor),
      // Only needed to render the header count on the first page — later
      // pages don't need to pay for it again.
      cursor ? null : momentViewModel.getMomentViewsCount(req.params.id),
    ]);

    res.json(totalCount === null ? result : { ...result, totalCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch viewers" });
  }
};

const toggleComments = async (req, res) => {
  try {
    // Ownership + active-story check and the flip itself all happen in one
    // atomic query (see toggleCommentsDisabled) — a wrong-owner or
    // already-expired/deleted request 404s exactly like a nonexistent one.
    const moment = await momentModel.toggleCommentsDisabled(
      req.params.id,
      req.user.userId,
    );

    if (!moment) {
      return res.status(404).json({ message: "Story not found" });
    }

    res.json({ commentsDisabled: Boolean(moment.commentsDisabled) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update story" });
  }
};

const deleteMoment = async (req, res) => {
  try {
    const markedMoment = await momentModel.deleteMoment(
      req.params.id,
      req.user.userId,
    );

    if (!markedMoment) {
      return res.status(404).json({ message: "Story not found" });
    }

    res.json({ deleted: true });

    finalizeMomentDeletion(markedMoment).catch((error) => {
      console.error("Failed to finalize story deletion:", error);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete story" });
  }
};

module.exports = {
  createMoment,
  getFeedMoments,
  getMomentsByAuthor,
  viewMoment,
  getMomentViewers,
  toggleComments,
  deleteMoment,
};
