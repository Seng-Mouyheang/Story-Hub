const recommendationModel = require("../../models/recommendation/recommendationModel");

const getAuthorRecommendations = async (req, res) => {
  try {
    const recommendations = await recommendationModel.getRecommendedAuthors(
      req.user.userId,
      {
        category: req.query.category,
        categories: req.query.categories,
        limit: req.query.limit,
        minLikes: req.query.minLikes,
      },
    );

    res.json(recommendations);
  } catch (error) {
    console.error(error);

    if (error.message === "Invalid user id") {
      return res.status(401).json({ message: "Invalid user id" });
    }

    res.status(500).json({ message: "Failed to fetch author recommendations" });
  }
};

module.exports = {
  getAuthorRecommendations,
};
