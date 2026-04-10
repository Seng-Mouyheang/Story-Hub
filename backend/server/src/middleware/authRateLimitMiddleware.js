const rateLimit = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;

const createRateLimiter = ({ max, message }) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

const loginRateLimiter = createRateLimiter({
  max: 10,
  message: "Too many login attempts. Please try again later.",
});

const signupRateLimiter = createRateLimiter({
  max: 5,
  message: "Too many signup attempts. Please try again later.",
});

module.exports = {
  loginRateLimiter,
  signupRateLimiter,
};
