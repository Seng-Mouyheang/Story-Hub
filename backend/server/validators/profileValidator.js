const Joi = require("joi");

/* ============================= */
/* COMMON FIELDS */
/* ============================= */

const usernamePattern = /^\w{3,30}$/;
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const baseFields = {
  displayName: Joi.string().trim().pattern(usernamePattern),

  bio: Joi.string().trim().max(500),

  interest: Joi.array().items(Joi.string().trim().max(50)),
};

/* ============================= */
/* UPDATE VALIDATION */
/* ============================= */

const updateProfileSchema = Joi.object({
  displayName: baseFields.displayName,
  bio: baseFields.bio.allow(""),
  interest: baseFields.interest,
}).min(1); // Must update at least one field

const userIdParamSchema = Joi.object({
  userId: Joi.string().pattern(objectIdPattern).required(),
});

const followListQuerySchema = Joi.object({
  cursor: Joi.string().pattern(objectIdPattern).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const accountSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(50).required(),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

module.exports = {
  updateProfileSchema,
  userIdParamSchema,
  followListQuerySchema,
  accountSearchQuerySchema,
};
