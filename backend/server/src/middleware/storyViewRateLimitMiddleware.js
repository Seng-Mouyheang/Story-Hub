const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const STORY_VIEW_WINDOW_MS = 60 * 60 * 1000;

const storyViewRateLimiter = rateLimit({
  windowMs: STORY_VIEW_WINDOW_MS,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `story-view:${req.params.id}:${ipKeyGenerator(req.ip)}`,
  message: { message: "Story view already tracked. Please try again later." },
});

module.exports = {
  storyViewRateLimiter,
};
