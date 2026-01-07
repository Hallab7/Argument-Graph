import { ApiError } from '../utils/ApiError.js';

// Simple in-memory rate limiter (for production, use Redis)
const requestCounts = new Map();

export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later'
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (now - data.resetTime > windowMs) {
        requestCounts.delete(ip);
      }
    }
    
    // Get or create request data for this IP
    let requestData = requestCounts.get(key);
    
    if (!requestData) {
      requestData = {
        count: 0,
        resetTime: now
      };
      requestCounts.set(key, requestData);
    }
    
    // Reset count if window has passed
    if (now - requestData.resetTime > windowMs) {
      requestData.count = 0;
      requestData.resetTime = now;
    }
    
    // Increment request count
    requestData.count++;
    
    // Check if limit exceeded
    if (requestData.count > maxRequests) {
      return next(ApiError.unprocessableEntity(message));
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count),
      'X-RateLimit-Reset': new Date(requestData.resetTime + windowMs).toISOString()
    });
    
    next();
  };
};

// Specific rate limiters for different endpoints
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

export const generalRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
});