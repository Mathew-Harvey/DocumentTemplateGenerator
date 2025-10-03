import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Max 15 file uploads per hour (5 sessions × 3 files)
  message: {
    success: false,
    error: {
      code: 'UPLOAD_LIMIT_EXCEEDED',
      message: 'Upload limit exceeded, please try again later',
    },
  },
});

/**
 * Rate limiter for LLM analysis
 */
export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 analyses per hour
  message: {
    success: false,
    error: {
      code: 'ANALYSIS_LIMIT_EXCEEDED',
      message: 'Analysis limit exceeded, please try again later',
    },
  },
});

