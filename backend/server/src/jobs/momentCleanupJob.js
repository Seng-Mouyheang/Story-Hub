const cron = require("node-cron");
const {
  findMomentsPastRetention,
  hardDeleteMoments,
} = require("../models/moment/momentModel");
const {
  deleteMomentFileWithRetry,
  mapWithConcurrency,
} = require("../services/momentMediaCleanupService");

const CRON_SCHEDULE = "0 3 * * *"; // daily at 3am
const BATCH_SIZE = 50;
const DELETE_CONCURRENCY = 10;

const cleanupBatch = async (moments) => {
  const results = await mapWithConcurrency(
    moments,
    DELETE_CONCURRENCY,
    async (moment) => ({
      id: moment._id,
      fileDeleted: await deleteMomentFileWithRetry(moment),
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
  let cursor = null;

  for (;;) {
    const moments = await findMomentsPastRetention(BATCH_SIZE, cursor);
    if (moments.length === 0) {
      break;
    }

    const { deletedCount, skippedCount } = await cleanupBatch(moments);
    totalDeleted += deletedCount;
    totalSkipped += skippedCount;

    // Advance past this page regardless of outcome — a moment whose file
    // deletion failed stays in the DB (findMomentsPastRetention will find
    // it again next run) but must not block later pages in *this* run from
    // being attempted.
    cursor = moments[moments.length - 1]._id;

    if (moments.length < BATCH_SIZE) {
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
