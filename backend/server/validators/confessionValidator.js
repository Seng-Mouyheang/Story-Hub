const Joi = require("joi");

/* ============================= */
/* COMMON FIELDS */
/* ============================= */

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const baseFields = {
  content: Joi.string().trim().min(5).max(2000),

  tags: Joi.array().items(Joi.string().trim().max(30)),

  isAnonymous: Joi.boolean(),

  visibility: Joi.string().valid("public", "private"),
};

/* ============================= */
/* CREATE VALIDATION */
/* ============================= */

const createConfessionSchema = Joi.object({
  content: baseFields.content.required(),
  tags: baseFields.tags,
  isAnonymous: baseFields.isAnonymous,
  visibility: baseFields.visibility,
});

/* ============================= */
/* UPDATE VALIDATION */
/* ============================= */

const updateConfessionSchema = Joi.object({
  content: baseFields.content,
  tags: baseFields.tags,
  isAnonymous: baseFields.isAnonymous,
  visibility: baseFields.visibility,
}).min(1); // Must update at least one field

/* ============================= */
/* PARAM VALIDATION */
/* ============================= */

const idParamSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

const cursorPaginationSchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  createConfessionSchema,
  updateConfessionSchema,
  idParamSchema,
  cursorPaginationSchema,
};
