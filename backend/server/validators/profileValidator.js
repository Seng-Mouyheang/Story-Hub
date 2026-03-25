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
/* CREATE VALIDATION */
/* ============================= */

const createProfileSchema = Joi.object({
  displayName: baseFields.displayName.required(),
  bio: baseFields.bio.allow(""),
  interest: baseFields.interest,
});

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

module.exports = {
  createProfileSchema,
  updateProfileSchema,
  userIdParamSchema,
};
