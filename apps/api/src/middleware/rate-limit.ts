import rateLimit from "express-rate-limit";

/**
 * Rate limiters (brute-force / abuse protection).
 * Auth endpoints get a stricter limit than the general API.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again later.",
    },
    meta: { requestId: "rate-limited" },
  },
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
