const { ObjectId } = require("mongodb");
const { connectToDatabase } = require("../../configuration/dbConfig");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const DEFAULT_POPULAR_LIKES_THRESHOLD = 10;

const REGEX_SPECIAL_CHARACTERS = new Set([
  "\\",
  "^",
  "$",
  ".",
  "|",
  "?",
  "*",
  "+",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
]);

const escapeRegex = (value) =>
  [...String(value)]
    .map((character) =>
      REGEX_SPECIAL_CHARACTERS.has(character) ? `\\${character}` : character,
    )
    .join("");

const getInterestCategoryRegex = (category) =>
  new RegExp(`^${escapeRegex(category.trim())}$`, "i");

const normalizeCategories = (categories) => {
  if (!Array.isArray(categories)) {
    return [];
  }

  const uniqueByLowerCase = new Set();

  return categories.reduce((accumulator, category) => {
    if (typeof category !== "string") {
      return accumulator;
    }

    const normalized = category.trim();
    if (!normalized) {
      return accumulator;
    }

    const key = normalized.toLowerCase();
    if (uniqueByLowerCase.has(key)) {
      return accumulator;
    }

    uniqueByLowerCase.add(key);
    accumulator.push(normalized);
    return accumulator;
  }, []);
};

const normalizeCategoriesQuery = (categoriesQueryValue) => {
  if (Array.isArray(categoriesQueryValue)) {
    return normalizeCategories(categoriesQueryValue);
  }

  if (typeof categoriesQueryValue === "string") {
    const parsedCategories = categoriesQueryValue
      .split(",")
      .map((category) => category.trim())
      .filter(Boolean);

    return normalizeCategories(parsedCategories);
  }

  return [];
};

const resolveTargetCategories = ({
  category,
  categories,
  profileInterests,
}) => {
  if (typeof category === "string" && category.trim() !== "") {
    return [category.trim()];
  }

  const requestedCategories = normalizeCategoriesQuery(categories);
  if (requestedCategories.length > 0) {
    return requestedCategories;
  }

  return normalizeCategories(profileInterests);
};

const getRecommendedAuthors = async (
  userId,
  {
    category,
    categories,
    limit = DEFAULT_LIMIT,
    minLikes = DEFAULT_POPULAR_LIKES_THRESHOLD,
  } = {},
) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  const userObjectId = new ObjectId(userId);
  const normalizedLimit = Math.max(
    1,
    Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
  );
  const normalizedMinLikes = Math.max(
    0,
    Number(minLikes) || DEFAULT_POPULAR_LIKES_THRESHOLD,
  );

  const db = await connectToDatabase();

  const currentUserProfile = await db.collection("profiles").findOne(
    {
      userId: userObjectId,
      deletedAt: null,
    },
    {
      projection: {
        interest: 1,
      },
    },
  );

  if (!currentUserProfile) {
    return {
      category: null,
      categories: [],
      data: [],
      metadata: {
        limit: normalizedLimit,
        minLikes: normalizedMinLikes,
      },
    };
  }

  const resolvedCategories = resolveTargetCategories({
    category,
    categories,
    profileInterests: currentUserProfile.interest,
  });

  if (resolvedCategories.length === 0) {
    return {
      category: null,
      categories: [],
      data: [],
      metadata: {
        limit: normalizedLimit,
        minLikes: normalizedMinLikes,
      },
    };
  }

  const categoryRegexes = resolvedCategories.map(getInterestCategoryRegex);
  const resolvedCategoriesLower = resolvedCategories.map((categoryValue) =>
    categoryValue.toLowerCase(),
  );

  const recommendations = await db
    .collection("stories")
    .aggregate([
      {
        $match: {
          status: "published",
          visibility: "public",
          deletedAt: null,
          likesCount: { $gte: normalizedMinLikes },
          genres: { $in: categoryRegexes },
          authorId: { $ne: userObjectId },
        },
      },
      {
        $addFields: {
          matchedCategoryHits: {
            $size: {
              $setIntersection: [
                {
                  $map: {
                    input: { $ifNull: ["$genres", []] },
                    as: "genre",
                    in: { $toLower: "$$genre" },
                  },
                },
                resolvedCategoriesLower,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: "$authorId",
          popularStoriesInCategory: { $sum: 1 },
          matchedCategoryHits: { $sum: "$matchedCategoryHits" },
          totalCategoryLikes: { $sum: "$likesCount" },
          bestStoryLikes: { $max: "$likesCount" },
          latestPopularStoryAt: { $max: "$publishedAt" },
        },
      },
      {
        $sort: {
          popularStoriesInCategory: -1,
          matchedCategoryHits: -1,
          totalCategoryLikes: -1,
          bestStoryLikes: -1,
          latestPopularStoryAt: -1,
          _id: 1,
        },
      },
      {
        $lookup: {
          from: "profiles",
          let: { authorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$authorId"] },
                deletedAt: null,
              },
            },
            {
              $project: {
                displayName: 1,
                profilePicture: 1,
                followers: 1,
                interest: 1,
              },
            },
          ],
          as: "profile",
        },
      },
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "users",
          let: { authorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$authorId"] },
                deletedAt: null,
              },
            },
            {
              $project: {
                username: 1,
              },
            },
          ],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "follows",
          let: { recommendedAuthorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$followerId", userObjectId] },
                    { $eq: ["$followingId", "$$recommendedAuthorId"] },
                  ],
                },
              },
            },
            {
              $limit: 1,
            },
          ],
          as: "alreadyFollowed",
        },
      },
      {
        $addFields: {
          followedByCurrentUser: {
            $gt: [{ $size: "$alreadyFollowed" }, 0],
          },
        },
      },
      {
        $match: {
          followedByCurrentUser: false,
        },
      },
      {
        $limit: normalizedLimit,
      },
      {
        $project: {
          _id: 0,
          authorId: "$_id",
          username: "$user.username",
          displayName: "$profile.displayName",
          profilePicture: "$profile.profilePicture",
          followers: "$profile.followers",
          authorInterests: "$profile.interest",
          popularStoriesInCategory: 1,
          matchedCategoryHits: 1,
          totalCategoryLikes: 1,
          bestStoryLikes: 1,
          latestPopularStoryAt: 1,
          followedByCurrentUser: 1,
        },
      },
    ])
    .toArray();

  return {
    category: resolvedCategories[0] || null,
    categories: resolvedCategories,
    data: recommendations,
    metadata: {
      limit: normalizedLimit,
      minLikes: normalizedMinLikes,
      categoriesCount: resolvedCategories.length,
    },
  };
};

module.exports = {
  getRecommendedAuthors,
};
