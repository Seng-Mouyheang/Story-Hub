const Joi = require("joi");

const recommendationAuthorQuerySchema = Joi.object({
  category: Joi.string().trim().min(1).max(50).optional(),
  categories: Joi.alternatives()
    .try(
      Joi.string().trim().min(1).max(250),
      Joi.array().items(Joi.string().trim().min(1).max(50)).max(20),
    )
    .optional(),
  limit: Joi.number().integer().min(1).max(30).default(10),
  minLikes: Joi.number().integer().min(0).max(1000000).default(10),
});

module.exports = {
  recommendationAuthorQuerySchema,
};
