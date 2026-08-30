const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Text-story background presets — kept as a fixed whitelist (rather than
// accepting arbitrary CSS) since this value gets applied directly as an
// inline style on the client.
const BACKGROUND_PRESETS = [
  "linear-gradient(135deg, #f97316 0%, #db2777 50%, #7c3aed 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4338ca 100%)",
  "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
  "linear-gradient(135deg, #22c55e 0%, #14b8a6 50%, #0891b2 100%)",
  "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)",
  "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)",
];

const createMomentSchema = Joi.object({
  type: Joi.string().valid("image", "text").required(),
  text: Joi.string()
    .trim()
    .max(500)
    .when("type", {
      is: "text",
      then: Joi.required(),
      otherwise: Joi.optional().allow(""),
    }),
  backgroundColor: Joi.string()
    .valid(...BACKGROUND_PRESETS)
    .optional(),
  imageUrl: Joi.string()
    .uri()
    .when("type", {
      is: "image",
      then: Joi.required(),
      otherwise: Joi.optional().allow(""),
    }),
  // The customId the image was uploaded under (see uploadThingRoute.js's
  // authenticateAndTagFiles) — required so the server can verify the
  // requesting user actually owns this file before trusting the URL.
  imageFileKey: Joi.string().when("type", {
    is: "image",
    then: Joi.required(),
    otherwise: Joi.optional().allow(""),
  }),
});

const idParamSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

const cursorPaginationSchema = Joi.object({
  cursor: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  createMomentSchema,
  idParamSchema,
  cursorPaginationSchema,
};
