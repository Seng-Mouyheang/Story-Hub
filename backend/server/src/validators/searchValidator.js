const Joi = require("joi");

const globalSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
  limit: Joi.number().integer().min(1).max(20).default(8),
});

const myStorySearchQuerySchema = Joi.object({
  title: Joi.string().trim().min(1).max(150).optional(),
  category: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().min(1).max(50)).min(1).max(20),
      Joi.string().trim().min(1).max(500),
    )
    .optional(),
  tag: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().min(1).max(30)).min(1).max(20),
      Joi.string().trim().min(1).max(300),
    )
    .optional(),
  includeDeleted: Joi.boolean().default(false),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

module.exports = {
  globalSearchQuerySchema,
  myStorySearchQuerySchema,
};
