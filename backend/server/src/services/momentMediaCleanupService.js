const {
  deleteFileByCustomId,
  deleteFileByTrustedUrl,
} = require("./uploadThingService");

const MAX_DELETE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A moment's DB doc is already invisible to reads once expired or marked
// pendingDeletion, so it is safe to leave it and retry on the next run; an
// orphaned UploadThing file is not (it keeps costing storage), so the file
// must be deleted first — and only counted as done when a real deletion
// happened, not just when the attempt didn't throw.
//
// Shared by momentCleanupJob.js (retention sweep) and momentController.js
// (manual delete) so both paths retry/skip identically.
const deleteMomentFileWithRetry = async (moment) => {
  if (!moment.imageUrl) {
    return true;
  }

  // imageFileKey is the authoritative id, verified as owned by the author
  // at moment-creation time (see momentController.createMoment). Older
  // moments created before that check existed only have imageUrl.
  const deleteOnce = moment.imageFileKey
    ? () => deleteFileByCustomId(moment.imageFileKey)
    : () => deleteFileByTrustedUrl(moment.imageUrl);

  for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt += 1) {
    try {
      // Resolves either way — `true` (deleted) or `false` (no key could be
      // resolved, so there was never anything to delete) both mean this
      // moment is done and safe to hard-delete. Only a thrown provider
      // failure (see uploadThingService.js) is retryable; treating an
      // unresolvable key as retryable would leave it stuck forever, since
      // no retry ever makes a key resolvable.
      await deleteOnce();
      return true;
    } catch (error) {
      const isLastAttempt = attempt === MAX_DELETE_ATTEMPTS;
      console.error(
        `Failed to delete UploadThing file for moment ${moment._id} (attempt ${attempt}/${MAX_DELETE_ATTEMPTS}):`,
        error,
      );
      if (!isLastAttempt) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  return false;
};

// Bounded-concurrency map — avoids firing one UploadThing call per item at
// once on a large batch, which risks tripping provider rate limits.
const mapWithConcurrency = async (items, limit, fn) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= items.length) {
          return;
        }
        results[currentIndex] = await fn(items[currentIndex]);
      }
    },
  );

  await Promise.all(workers);
  return results;
};

module.exports = { deleteMomentFileWithRetry, mapWithConcurrency };
