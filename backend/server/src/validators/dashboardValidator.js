const Joi = require("joi");

const storyDashboardQuerySchema = Joi.object({
  status: Joi.string().valid("published", "draft", "all").default("all"),
  visibility: Joi.string().valid("public", "private", "all").default("all"),
  deleted: Joi.string().valid("active", "deleted", "all").default("active"),
  sortBy: Joi.string().valid("date", "likes").default("date"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const confessionDashboardQuerySchema = Joi.object({
  sortBy: Joi.string().valid("date", "likes").default("date"),
  order: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  storyDashboardQuerySchema,
  confessionDashboardQuerySchema,
};
