const calculateUserStats = async (db, userObjectId) => {
  const [
    storyLikesResult,
    confessionLikesResult,
    storyWordsResult,
    confessionWordsResult,
  ] = await Promise.all([
    db
      .collection("storyLikes")
      .aggregate([
        {
          $lookup: {
            from: "stories",
            localField: "storyId",
            foreignField: "_id",
            as: "story",
          },
        },
        {
          $unwind: "$story",
        },
        {
          $match: {
            "story.authorId": userObjectId,
            "story.deletedAt": null,
          },
        },
        {
          $count: "totalLikes",
        },
      ])
      .toArray(),
    db
      .collection("confessionLikes")
      .aggregate([
        {
          $lookup: {
            from: "confessions",
            localField: "confessionId",
            foreignField: "_id",
            as: "confession",
          },
        },
        {
          $unwind: "$confession",
        },
        {
          $match: {
            "confession.authorId": userObjectId,
            "confession.deletedAt": null,
          },
        },
        {
          $count: "totalLikes",
        },
      ])
      .toArray(),
    db
      .collection("stories")
      .aggregate([
        {
          $match: {
            authorId: userObjectId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalWords: { $sum: "$wordCount" },
            storyCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection("confessions")
      .aggregate([
        {
          $match: {
            authorId: userObjectId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalWords: { $sum: "$wordCount" },
            confessionCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  const storyLikes = storyLikesResult[0]?.totalLikes || 0;
  const confessionLikes = confessionLikesResult[0]?.totalLikes || 0;
  const storyWords = storyWordsResult[0]?.totalWords || 0;
  const confessionWords = confessionWordsResult[0]?.totalWords || 0;
  const storyCount = storyWordsResult[0]?.storyCount || 0;
  const confessionCount = confessionWordsResult[0]?.confessionCount || 0;

  return {
    totalLikes: storyLikes + confessionLikes,
    totalWords: storyWords + confessionWords,
    totalPosts: storyCount + confessionCount,
    breakdown: {
      storyLikes,
      confessionLikes,
      storyWords,
      confessionWords,
      storyCount,
      confessionCount,
    },
  };
};

module.exports = {
  calculateUserStats,
};
