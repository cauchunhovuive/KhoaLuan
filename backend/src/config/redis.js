const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

function getRedis() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err.message);
    });
  }
  return redis;
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  try {
    const client = getRedis();
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.warn('Redis cache set failed:', error.message);
  }
}

async function cacheGet(key) {
  try {
    const client = getRedis();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn('Redis cache get failed:', error.message);
    return null;
  }
}

async function cacheDel(key) {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (error) {
    logger.warn('Redis cache del failed:', error.message);
  }
}

module.exports = {
  getRedis,
  cacheSet,
  cacheGet,
  cacheDel,
};
