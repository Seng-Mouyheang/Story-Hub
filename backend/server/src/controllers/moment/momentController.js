const momentModel = require("../../models/moment/momentModel");
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
      // record so the upload isn't left permanently unowned.
      uploadOwnershipModel
        .recordUpload(claimedRecord.customId, claimedRecord.userId)
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
  deleteMoment,
};
