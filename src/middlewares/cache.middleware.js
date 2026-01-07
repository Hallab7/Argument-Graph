import cacheService from '../services/cache.service.js';

// Cache middleware for AI endpoints
export const cacheAIResponse = (endpoint, getTTL = () => 24 * 60 * 60 * 1000) => {
  return async (req, res, next) => {
    try {
      // Extract relevant data for caching
      const input = req.body;
      const options = {
        // Include any query parameters that affect the response
        ...req.query
      };

      // Generate cache key
      const cacheKey = cacheService.generateKey(endpoint, input, options);

      // Try to get from cache
      const cachedResult = cacheService.get(cacheKey);
      
      if (cachedResult) {
        console.log(`🎯 Cache HIT for ${endpoint}:`, cacheKey.substring(0, 20) + '...');
        
        // Add cache metadata to response
        const response = {
          ...cachedResult,
          meta: {
            ...cachedResult.meta,
            cached: true,
            cacheKey: cacheKey.substring(0, 20) + '...'
          }
        };
        
        return res.json(response);
      }

      console.log(`💾 Cache MISS for ${endpoint}:`, cacheKey.substring(0, 20) + '...');

      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data) {
        // Only cache successful responses
        if (data.success) {
          const ttl = getTTL(req, data);
          cacheService.set(cacheKey, data, ttl);
          console.log(`✅ Cached response for ${endpoint} (TTL: ${Math.round(ttl/1000/60)} minutes)`);
        }
        
        // Call original res.json
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching if there's an error
      next();
    }
  };
};

// Different TTL strategies
export const cacheTTL = {
  // Short cache for dynamic content
  short: () => 1 * 60 * 60 * 1000, // 1 hour
  
  // Medium cache for semi-static content
  medium: () => 6 * 60 * 60 * 1000, // 6 hours
  
  // Long cache for stable content
  long: () => 24 * 60 * 60 * 1000, // 24 hours
  
  // Very long cache for rarely changing content
  veryLong: () => 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Dynamic TTL based on content
  dynamic: (req, data) => {
    // Cache longer for high-confidence results
    if (data.data?.analysis?.averageConfidence > 0.8) {
      return 24 * 60 * 60 * 1000; // 24 hours
    }
    // Cache shorter for low-confidence results
    return 6 * 60 * 60 * 1000; // 6 hours
  }
};