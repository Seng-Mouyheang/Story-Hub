const { normalizeEmail } = require("../utils/email");

const ensureUserEmailBackfillAndDedup = async (database) => {
  const users = database.collection("users");
  const now = new Date();

  const cursor = users.find(
    {},
    {
      projection: {
        _id: 1,
        email: 1,
        createdAt: 1,
        deletedAt: 1,
      },
    },
  );

  const activeByEmail = new Map();
  const emailNormalizationOps = [];

  for await (const user of cursor) {
    const normalized = normalizeEmail(user.email);

    if (user.email !== normalized) {
      emailNormalizationOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              email: normalized,
              updatedAt: now,
            },
          },
        },
      });
    }

    if (user.deletedAt !== null || !normalized) {
      continue;
    }

    if (!activeByEmail.has(normalized)) {
      activeByEmail.set(normalized, [user]);
      continue;
    }

    activeByEmail.get(normalized).push(user);
  }

  if (emailNormalizationOps.length > 0) {
    await users.bulkWrite(emailNormalizationOps, { ordered: false });
  }

  const dedupeOps = [];

  for (const [, collisions] of activeByEmail.entries()) {
    if (collisions.length < 2) {
      continue;
    }

    const sorted = collisions.sort((a, b) => {
      const aDate = a.createdAt
        ? new Date(a.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bDate = b.createdAt
        ? new Date(b.createdAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      if (aDate !== bDate) {
        return aDate - bDate;
      }

      return String(a._id).localeCompare(String(b._id));
    });

    const canonicalUser = sorted[0];
    const duplicates = sorted.slice(1);

    for (const duplicateUser of duplicates) {
      dedupeOps.push({
        updateOne: {
          filter: { _id: duplicateUser._id, deletedAt: null },
          update: {
            $set: {
              deletedAt: now,
              duplicateOf: canonicalUser._id,
              updatedAt: now,
            },
          },
        },
      });
    }
  }

  if (dedupeOps.length > 0) {
    await users.bulkWrite(dedupeOps, { ordered: false });
  }
};

const ensureNormalizedUniqueUserEmailIndex = async (database) => {
  const users = database.collection("users");
  const indexes = await users.indexes();
  const uniqueEmailIndex = indexes.find(
    (index) => index.name === "unique_user_email",
  );

  if (uniqueEmailIndex) {
    const hasSameKey =
      JSON.stringify(uniqueEmailIndex.key) === JSON.stringify({ email: 1 });
    const hasExpectedPartialFilter =
      JSON.stringify(uniqueEmailIndex.partialFilterExpression || {}) ===
      JSON.stringify({ deletedAt: null, email: { $gt: "" } });

    if (!hasSameKey || !uniqueEmailIndex.unique || !hasExpectedPartialFilter) {
      await users.dropIndex("unique_user_email");
    }
  }

  await users.createIndex(
    { email: 1 },
    {
      unique: true,
      name: "unique_user_email",
      partialFilterExpression: {
        deletedAt: null,
        // MongoDB partial indexes do not support $ne on all deployments.
        email: { $gt: "" },
      },
    },
  );
};

module.exports = {
  ensureUserEmailBackfillAndDedup,
  ensureNormalizedUniqueUserEmailIndex,
};
