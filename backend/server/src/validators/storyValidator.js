const Joi = require("joi");

/* ============================= */
/* COMMON FIELDS */
/* ============================= */

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const baseFields = {
  title: Joi.string().trim().min(3).max(150),

  summary: Joi.string().trim().max(500),

  content: Joi.string().trim().min(5).max(100000),

  genres: Joi.array().items(Joi.string().trim().max(50)),

  tags: Joi.array().items(Joi.string().trim().max(30)),

  visibility: Joi.string().valid("public", "private"),

  status: Joi.string().valid("draft", "published"),
};

/* ============================= */
/* CREATE VALIDATION */
/* ============================= */

const createStorySchema = Joi.object({
  title: baseFields.title.required(),
  summary: baseFields.summary.allow(""),
  content: baseFields.content.required(),
  genres: baseFields.genres,
  tags: baseFields.tags,
  visibility: baseFields.visibility,
  status: baseFields.status,
});

/* ============================= */
/* UPDATE VALIDATION */
/* ============================= */

const updateStorySchema = Joi.object({
  title: baseFields.title,
  summary: baseFields.summary.allow(""),
  content: baseFields.content,
  genres: baseFields.genres,
  tags: baseFields.tags,
  visibility: baseFields.visibility,
  status: baseFields.status,
}).min(1); // Must update at least one field

/* ============================= */
/* PARAM VALIDATION */
/* ============================= */

const idParamSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

const tagParamSchema = Joi.object({
  tag: Joi.string().trim().min(1).max(30).required(),
});

const cursorPaginationSchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().valid("latest", "popular").optional(),
});

const categorySearchQuerySchema = Joi.object({
  categories: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().min(1).max(50)).min(1).max(20),
      Joi.string().trim().min(1).max(500),
    )
    .required(),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string().valid("latest", "popular").optional(),
});

const titleSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(150).required(),
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  createStorySchema,
  updateStorySchema,
  idParamSchema,
  tagParamSchema,
  categorySearchQuerySchema,
  titleSearchQuerySchema,
  cursorPaginationSchema,
};
