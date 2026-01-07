import crypto from 'crypto';

class CacheService {
  constructor() {
    // In-memory cache - you could replace this with Redis for production
    this.cache = new Map();
    this.maxCacheSize = 1000; // Maximum number of cached items
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Generate a hash key from the input parameters
  generateKey(endpoint, input, options = {}) {
    const data = {
      endpoint,
      input: typeof input === 'string' ? input.toLowerCase().trim() : input,
      options: this.normalizeOptions(options)
    };
    
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    
    return `ai_cache:${endpoint}:${hash}`;
  }

  // Normalize options to ensure consistent caching
  normalizeOptions(options) {
    const normalized = { ...options };
    
    // Sort object keys for consistent hashing
    const sortedOptions = {};
    Object.keys(normalized).sort().forEach(key => {
      sortedOptions[key] = normalized[key];
    });
    
    return sortedOptions;
  }

  // Get cached result
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    cached.lastAccessed = Date.now();
    return cached.data;
  }

  // Set cached result
  set(key, data, ttl = this.defaultTTL) {
    // Clean up if cache is getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    const cacheItem = {
      data,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, cacheItem);
  }

  // Clean up old/least recently used items
  cleanup() {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      totalItems: this.cache.size,
      maxSize: this.maxCacheSize,
      expired: entries.filter(item => now > item.expiresAt).length,
      oldestItem: entries.length > 0 ? Math.min(...entries.map(item => item.createdAt)) : null,
      newestItem: entries.length > 0 ? Math.max(...entries.map(item => item.createdAt)) : null
    };
  }

  // Check if a specific input would be cached
  wouldCache(endpoint, input, options = {}) {
    const key = this.generateKey(endpoint, input, options);
    return this.cache.has(key);
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;