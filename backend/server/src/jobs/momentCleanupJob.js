const cron = require("node-cron");
const {
  findMomentsPastRetention,
  hardDeleteMoments,
} = require("../models/moment/momentModel");
const {
  deleteFileByCustomId,
  deleteFileByTrustedUrl,
} = require("../services/uploadThingService");

const CRON_SCHEDULE = "0 3 * * *"; // daily at 3am
const BATCH_SIZE = 50;
const MAX_DELETE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A moment's DB doc is already invisible to reads once expired, so it is
// safe to leave it and retry on the next run; an orphaned UploadThing file
// is not (it keeps costing storage), so the file must be deleted first —
// and only counted as done when a real deletion happened, not just when
// the attempt didn't throw.
const deleteMomentFileWithRetry = async (moment) => {
  // imageFileKey is the authoritative id, verified as owned by the author
  // at moment-creation time (see momentController.createMoment). Older
  // moments created before that check existed only have imageUrl.
  const deleteOnce = moment.imageFileKey
    ? () => deleteFileByCustomId(moment.imageFileKey)
    : () => deleteFileByTrustedUrl(moment.imageUrl);

  for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt += 1) {
    try {
      const deleted = await deleteOnce();
      if (deleted) {
        return true;
      }
      // Nothing to delete (no key could be resolved) — no point retrying.
      return false;
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

const cleanupBatch = async (moments) => {
  const results = await Promise.all(
    moments.map(async (moment) => {
      const fileDeleted = moment.imageUrl
        ? await deleteMomentFileWithRetry(moment)
        : true;
      return { id: moment._id, fileDeleted };
    }),
  );

  const readyIds = results
    .filter((result) => result.fileDeleted)
    .map((result) => result.id);

  const deletedCount = await hardDeleteMoments(readyIds);

  return { deletedCount, skippedCount: results.length - readyIds.length };
};

const runMomentCleanup = async () => {
  let totalDeleted = 0;
  let totalSkipped = 0;

  for (;;) {
    // Re-queried each iteration (rather than paged) since deleted moments
    // drop out of this same "past retention" set, and skipped ones would
    // otherwise be re-fetched forever within a single run.
    const moments = await findMomentsPastRetention(BATCH_SIZE);
    if (moments.length === 0) {
      break;
    }

    const { deletedCount, skippedCount } = await cleanupBatch(moments);
    totalDeleted += deletedCount;
    totalSkipped += skippedCount;

    if (moments.length < BATCH_SIZE || deletedCount === 0) {
      break;
    }
  }

  return { deletedCount: totalDeleted, skippedCount: totalSkipped };
};

const startMomentCleanupJob = () => {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        const { deletedCount, skippedCount } = await runMomentCleanup();
        if (deletedCount > 0) {
          console.log(
            `Moment cleanup: removed ${deletedCount} moment(s) past 7-day retention.`,
          );
        }
        if (skippedCount > 0) {
          console.warn(
            `Moment cleanup: left ${skippedCount} moment(s) for retry after UploadThing delete failures.`,
          );
        }
      } catch (error) {
        console.error("Moment cleanup job failed:", error);
      }
    },
    // Guards against a slow run (large backlog, retries) still being
    // in-flight when the next day's trigger fires.
    { noOverlap: true },
  );
};

module.exports = { startMomentCleanupJob, runMomentCleanup };
