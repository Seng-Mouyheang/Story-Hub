const momentModel = require("../../models/moment/momentModel");
const followModel = require("../../models/profile/followModel");
const uploadOwnershipModel = require("../../models/profile/uploadOwnershipModel");
const {
  deleteFileByCustomId,
  deleteFileByTrustedUrl,
} = require("../../services/uploadThingService");

// Best-effort cleanup of a moment's image after it's no longer referenced
// by any document — never awaited on the response path, and failures are
// left for the retention cleanup job to retry (it falls back to imageUrl
// for moments whose file couldn't be deleted here).
const cleanupMomentImage = ({ imageFileKey, imageUrl }) => {
  const deletion = imageFileKey
    ? deleteFileByCustomId(imageFileKey)
    : deleteFileByTrustedUrl(imageUrl);

  deletion.catch((error) => {
    console.error("Failed to delete UploadThing file for moment:", error);
  });
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
  try {
    const { type, text, backgroundColor, imageUrl, imageFileKey } = req.body;

    if (type === "image") {
      const owns = await uploadOwnershipModel.isOwner(
        imageFileKey,
        req.user.userId,
      );

      if (!owns) {
        return res.status(403).json({ message: "You do not own this image" });
      }
    }

    const momentId = await momentModel.createMoment({
      authorId: req.user.userId,
      type,
      text,
      backgroundColor,
      imageUrl,
      imageFileKey: type === "image" ? imageFileKey : null,
    });

    res.status(201).json({ momentId });

    // The file is now owned by this moment rather than a pending upload —
    // drop the ownership-tracking record so it doesn't outlive the file
    // (see uploadOwnershipModel.js's own doc comment on this invariant).
    if (type === "image") {
      uploadOwnershipModel.removeRecord(imageFileKey).catch((error) => {
        console.error("Failed to clear upload ownership record:", error);
      });
    }
  } catch (error) {
    console.error(error);
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
    const deletedMoment = await momentModel.deleteMoment(
      req.params.id,
      req.user.userId,
    );

    if (!deletedMoment) {
      return res.status(404).json({ message: "Story not found" });
    }

    res.json({ deleted: true });

    if (deletedMoment.type === "image" && deletedMoment.imageUrl) {
      cleanupMomentImage(deletedMoment);
    }
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
