const Joi = require("joi");

const globalSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
  limit: Joi.number().integer().min(1).max(20).default(8),
});

module.exports = {
  globalSearchQuerySchema,
};
