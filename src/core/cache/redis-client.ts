/**
 * Redis Client
 * 
 * Singleton Redis connection manager with automatic reconnection and error handling
 */

import Redis from 'ioredis';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('Redis');

// Type for Redis instance - using any due to ES module import issues with Node16
type RedisClient = any;
let redisClient: RedisClient | null = null;
let isConnecting = false;

export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db?: number;
  ttlDefault?: number;
}

/**
 * Get Redis configuration from environment variables
 */
export function getRedisConfig(): RedisConfig {
  const enabled = process.env.REDIS_ENABLED === 'true' || process.env.REDIS_ENABLED === undefined;
  
  return {
    enabled,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttlDefault: parseInt(process.env.REDIS_TTL_DEFAULT || '300', 10) // 5 minutes default
  };
}

/**
 * Initialize Redis client connection
 */
export async function getRedisClient(): Promise<RedisClient | null> {
  const config = getRedisConfig();
  
  if (!config.enabled) {
    logger.debug('Redis is disabled');
    return null;
  }

  // Return existing client if available
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    logger.debug('Redis connection already in progress, waiting...');
    // Wait for connection with timeout
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (redisClient && redisClient.status === 'ready') {
          clearInterval(checkInterval);
          resolve(redisClient);
        } else if (!isConnecting) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 5000);
    });
  }

  isConnecting = true;

  try {
    logger.info(`Connecting to Redis at ${config.host}:${config.port}...`);
    
    const redis = new (Redis as any)({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.debug(`Redis retry attempt ${times}, delay ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient = redis;

    // Event handlers
    redis.on('connect', () => {
      logger.info('Redis connected successfully');
      isConnecting = false;
    });

    redis.on('ready', () => {
      logger.info('Redis ready to accept commands');
      isConnecting = false;
    });

    redis.on('error', (error: Error) => {
      logger.error('Redis error:', error);
      isConnecting = false;
      // Don't set redisClient to null on error - let retry strategy handle reconnection
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
      isConnecting = false;
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
      isConnecting = true;
    });

    // Wait for connection
    await redis.connect();
    
    // Test connection
    await redis.ping();
    logger.info('Redis connection test successful');
    
    isConnecting = false;
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    isConnecting = false;
    redisClient = null;
    return null;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }
  
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
