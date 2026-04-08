const confessionModel = require("../models/confessionModel");

const createConfession = async (req, res) => {
  try {
    const confessionId = await confessionModel.createConfession({
      ...req.body,
      authorId: req.user.userId,
    });

    res.status(201).json({ confessionId });
  } catch {
    res.status(500).json({ message: "Failed to create confession" });
  }
};

// Cursor Pagination
const getAllConfessions = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await confessionModel.getPublishedConfessions(
      cursor,
      limit,
      req.user?.userId,
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getConfession = async (req, res) => {
  try {
    const confession = await confessionModel.getConfessionById(
      req.params.id,
      req.user?.userId,
    );

    if (!confession) {
      return res.status(404).json({ message: "Confession not found" });
    }

    if (confession.visibility === "private") {
      if (
        !req.user ||
        confession.authorId.toString() !== req.user.userId.toString()
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    if (confession.visibility === "public") {
      await confessionModel.incrementViews(confession._id);
    }

    res.json(confession);
  } catch {
    res.status(500).json({ message: "Failed to fetch confession" });
  }
};

const updateConfession = async (req, res) => {
  try {
    await confessionModel.updateConfession(
      req.params.id,
      req.user.userId,
      req.body,
    );

    res.json({ message: "Confession updated" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Confession not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to update confession" });
  }
};

const deleteConfession = async (req, res) => {
  try {
    await confessionModel.deleteConfession(req.params.id, req.user.userId);

    res.json({ message: "Confession deleted" });
  } catch (error) {
    if (error.message === "not found") {
      return res.status(404).json({ message: "Confession not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.status(500).json({ message: "Failed to delete confession" });
  }
};

const getMyConfessions = async (req, res) => {
  try {
    const { cursor } = req.query;
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const result = await confessionModel.getUserConfessions(
      req.user.userId,
      cursor,
      limit,
    );

    res.json(result);
  } catch {
    res.status(500).json({ message: "Failed to fetch user confessions" });
  }
};

module.exports = {
  createConfession,
  getAllConfessions,
  getConfession,
  updateConfession,
  deleteConfession,

  getMyConfessions,
};
