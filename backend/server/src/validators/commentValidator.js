const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
  parentId: Joi.string().pattern(objectIdPattern).allow(null).optional(),
});

const updateCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
});

module.exports = {
  createCommentSchema,
  updateCommentSchema,
};
