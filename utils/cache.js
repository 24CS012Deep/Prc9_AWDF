const NodeCache = require('node-cache');

const defaultTTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 60;

// Shared NodeCache instance with standard TTL
const nodeCache = new NodeCache({
  stdTTL: defaultTTL,
  checkperiod: 120,
  useClones: false
});

// Telemetry counters for cache hit/miss analysis
const stats = {
  hits: 0,
  misses: 0,
  writes: 0,
  invalidations: 0
};

const cache = {
  get: (key) => {
    const data = nodeCache.get(key);
    if (data !== undefined) {
      stats.hits += 1;
      return data;
    }
    stats.misses += 1;
    return null;
  },

  set: (key, value, ttl = defaultTTL) => {
    stats.writes += 1;
    return nodeCache.set(key, value, ttl);
  },

  del: (key) => {
    stats.invalidations += 1;
    return nodeCache.del(key);
  },

  flush: () => {
    stats.invalidations += nodeCache.keys().length;
    return nodeCache.flushAll();
  },

  getStats: () => {
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? ((stats.hits / totalRequests) * 100).toFixed(2) : '0.00';

    return {
      totalRequests,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${hitRate}%`,
      writes: stats.writes,
      invalidations: stats.invalidations,
      activeKeysCount: nodeCache.keys().length,
      activeKeys: nodeCache.keys(),
      ttlConfiguredSeconds: defaultTTL
    };
  }
};

module.exports = cache;
