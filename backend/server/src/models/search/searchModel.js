const { connectToDatabase } = require("../../configuration/dbConfig");
const { ObjectId } = require("mongodb");

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
  [...value]
    .map((character) =>
      REGEX_SPECIAL_CHARACTERS.has(character) ? `\\${character}` : character,
    )
    .join("");

const buildAccountSearchPipeline = (escapedQuery, limit) => [
  {
    $match: {
      deletedAt: null,
    },
  },
  {
    $lookup: {
      from: "users",
      let: { profileUserId: "$userId" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$profileUserId"] },
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
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $match: {
      $or: [
        { "user.username": { $regex: escapedQuery, $options: "i" } },
        { displayName: { $regex: escapedQuery, $options: "i" } },
      ],
    },
  },
  {
    $addFields: {
      relevanceScore: {
        $add: [
          {
            $cond: [
              {
                $regexMatch: {
                  input: "$user.username",
                  regex: `^${escapedQuery}$`,
                  options: "i",
                },
              },
              100,
              0,
            ],
          },
          {
            $cond: [
              {
                $regexMatch: {
                  input: "$user.username",
                  regex: `^${escapedQuery}`,
                  options: "i",
                },
              },
              80,
              0,
            ],
          },
          {
            $cond: [
              {
                $regexMatch: {
                  input: "$displayName",
                  regex: `^${escapedQuery}$`,
                  options: "i",
                },
              },
              65,
              0,
            ],
          },
          {
            $cond: [
              {
                $regexMatch: {
                  input: "$displayName",
                  regex: `^${escapedQuery}`,
                  options: "i",
                },
              },
              45,
              0,
            ],
          },
        ],
      },
    },
  },
  {
    $sort: {
      relevanceScore: -1,
      followers: -1,
      createdAt: 1,
    },
  },
  {
    $limit: limit,
  },
  {
    $project: {
      _id: 0,
      userId: 1,
      username: "$user.username",
      displayName: 1,
      bio: 1,
      interest: 1,
      profilePicture: 1,
      followers: 1,
      following: 1,
    },
  },
];

const buildStorySearchPipeline = (escapedQuery, limit, isTagSearch) => {
  const matchStage = {
    status: "published",
    visibility: "public",
    deletedAt: null,
  };

  if (isTagSearch) {
    matchStage.tags = {
      $elemMatch: {
        $regex: `^${escapedQuery}$`,
        $options: "i",
      },
    };
  }

  const queryMatchStage = isTagSearch
    ? null
    : {
        $match: {
          $or: [
            { title: { $regex: escapedQuery, $options: "i" } },
            { summary: { $regex: escapedQuery, $options: "i" } },
            { tags: { $elemMatch: { $regex: escapedQuery, $options: "i" } } },
          ],
        },
      };

  const pipeline = [
    {
      $match: matchStage,
    },
  ];

  if (queryMatchStage) {
    pipeline.push(queryMatchStage);
  }

  pipeline.push(
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
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
            },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        relevanceScore: {
          $add: [
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$title",
                    regex: `^${escapedQuery}$`,
                    options: "i",
                  },
                },
                100,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$title",
                    regex: `^${escapedQuery}`,
                    options: "i",
                  },
                },
                70,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$summary",
                    regex: escapedQuery,
                    options: "i",
                  },
                },
                35,
                0,
              ],
            },
            {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$tags",
                          as: "tag",
                          cond: {
                            $regexMatch: {
                              input: "$$tag",
                              regex: `^${escapedQuery}$`,
                              options: "i",
                            },
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                80,
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        relevanceScore: -1,
        publishedAt: -1,
        _id: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 1,
        authorId: 1,
        title: 1,
        summary: 1,
        tags: 1,
        views: 1,
        likesCount: 1,
        commentCount: 1,
        publishedAt: 1,
        authorDisplayName: "$author.displayName",
      },
    },
  );

  return pipeline;
};

const resolveAuthorDisplayName = (confession, currentUserId = null) => {
  const profileName = confession.author?.displayName || null;

  if (!confession.isAnonymous) {
    return profileName;
  }

  if (
    currentUserId &&
    ObjectId.isValid(currentUserId) &&
    confession.authorId.toString() === currentUserId.toString()
  ) {
    return profileName || "Anonymous";
  }

  return "Anonymous";
};

const buildConfessionSearchPipeline = (escapedQuery, limit, isTagSearch) => {
  const matchStage = {
    visibility: "public",
    deletedAt: null,
  };

  if (isTagSearch) {
    matchStage.tags = {
      $elemMatch: {
        $regex: `^${escapedQuery}$`,
        $options: "i",
      },
    };
  }

  const queryMatchStage = isTagSearch
    ? null
    : {
        $match: {
          $or: [
            { content: { $regex: escapedQuery, $options: "i" } },
            { tags: { $elemMatch: { $regex: escapedQuery, $options: "i" } } },
          ],
        },
      };

  const pipeline = [
    {
      $match: matchStage,
    },
  ];

  if (queryMatchStage) {
    pipeline.push(queryMatchStage);
  }

  pipeline.push(
    {
      $lookup: {
        from: "profiles",
        let: { authorId: "$authorId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$userId", "$$authorId"] },
              deletedAt: null,
            },
          },
          {
            $project: { displayName: 1 },
          },
        ],
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        relevanceScore: {
          $add: [
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$content",
                    regex: `^${escapedQuery}`,
                    options: "i",
                  },
                },
                65,
                0,
              ],
            },
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$content",
                    regex: escapedQuery,
                    options: "i",
                  },
                },
                45,
                0,
              ],
            },
            {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$tags",
                          as: "tag",
                          cond: {
                            $regexMatch: {
                              input: "$$tag",
                              regex: `^${escapedQuery}$`,
                              options: "i",
                            },
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                80,
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: {
        relevanceScore: -1,
        createdAt: -1,
        _id: -1,
      },
    },
    {
      $limit: limit,
    },
    {
      $project: {
        _id: 1,
        authorId: 1,
        content: 1,
        tags: 1,
        isAnonymous: 1,
        views: 1,
        likesCount: 1,
        commentCount: 1,
        createdAt: 1,
        author: 1,
      },
    },
  );

  return pipeline;
};

const normalizeListFilter = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => item.trim()))].filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return [...new Set(value.split(",").map((item) => item.trim()))].filter(
    Boolean,
  );
};

const searchGlobal = async (query, limit, currentUserId) => {
  const db = await connectToDatabase();

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      query: "",
      isTagSearch: false,
      accounts: [],
      stories: [],
      confessions: [],
    };
  }

  const isTagSearch = trimmedQuery.startsWith("#");
  const normalizedQuery = isTagSearch
    ? trimmedQuery.slice(1).trim()
    : trimmedQuery;

  if (!normalizedQuery) {
    return {
      query: trimmedQuery,
      isTagSearch,
      accounts: [],
      stories: [],
      confessions: [],
    };
  }

  const escapedQuery = escapeRegex(normalizedQuery);

  const [accounts, stories, rawConfessions] = await Promise.all([
    db
      .collection("profiles")
      .aggregate(buildAccountSearchPipeline(escapedQuery, limit))
      .toArray(),
    db
      .collection("stories")
      .aggregate(buildStorySearchPipeline(escapedQuery, limit, isTagSearch))
      .toArray(),
    db
      .collection("confessions")
      .aggregate(
        buildConfessionSearchPipeline(escapedQuery, limit, isTagSearch),
      )
      .toArray(),
  ]);

  const confessions = rawConfessions.map((confession) => ({
    ...confession,
    authorDisplayName: resolveAuthorDisplayName(confession, currentUserId),
    author: undefined,
  }));

  return {
    query: trimmedQuery,
    normalizedQuery,
    isTagSearch,
    accounts,
    stories,
    confessions,
  };
};

const searchMyStories = async (filters, userId) => {
  const db = await connectToDatabase();
  const {
    title,
    category,
    tag,
    includeDeleted = false,
    limit = 20,
  } = filters || {};

  const parsedLimit = Number.parseInt(limit, 10) || 20;
  const categories = normalizeListFilter(category);
  const tags = normalizeListFilter(tag);

  const matchStage = {
    authorId: new ObjectId(userId),
  };

  if (!includeDeleted) {
    matchStage.deletedAt = null;
  }

  if (typeof title === "string" && title.trim()) {
    matchStage.title = {
      $regex: escapeRegex(title.trim()),
      $options: "i",
    };
  }

  if (categories.length) {
    matchStage.genres = {
      $elemMatch: {
        $in: categories.map(
          (item) => new RegExp(`^${escapeRegex(item)}$`, "i"),
        ),
      },
    };
  }

  if (tags.length) {
    matchStage.tags = {
      $elemMatch: {
        $in: tags.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i")),
      },
    };
  }

  const stories = await db
    .collection("stories")
    .find(matchStage)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(parsedLimit)
    .toArray();

  return {
    filters: {
      title: title || null,
      categories,
      tags,
      includeDeleted: Boolean(includeDeleted),
    },
    data: stories,
  };
};

module.exports = {
  searchGlobal,
  searchMyStories,
};
