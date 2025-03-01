// src/lib/storage.js
const { createClient } = require('redis');
let client;
let isConnected = false;

// Initialize Redis connection
async function initializeRedis() {
  if (!isConnected) {
    try {
      // Use the environment variables exactly as provided by Upstash/Vercel
      const redisUrl = process.env.KV_URL || process.env.REDIS_URL || 'redis://localhost:6379';
      
      console.log(`Connecting to Redis at ${redisUrl.split('@')[0]}...`);  // Hide credentials in logs
      
      client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            // Exponential backoff with max retry of 10 seconds
            return Math.min(retries * 100, 10000);
          }
        }
      });
      
      client.on('error', (err) => {
        console.error('Redis Client Error', err);
        isConnected = false;
      });
      
      await client.connect();
      isConnected = true;
      console.log('Connected to Redis successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }
  return client;
}

// KV-like interface for consistent usage
const storage = {
  async get(key) {
    try {
      const redis = await initializeRedis();
      return redis.get(key);
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      throw error;
    }
  },
  
  async set(key, value) {
    try {
      const redis = await initializeRedis();
      return redis.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      throw error;
    }
  },
  
  async del(key) {
    try {
      const redis = await initializeRedis();
      return redis.del(key);
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  },
  
  // Additional Redis operations as needed
  async keys(pattern) {
    try {
      const redis = await initializeRedis();
      return redis.keys(pattern);
    } catch (error) {
      console.error(`Error listing keys with pattern ${pattern}:`, error);
      throw error;
    }
  }
};

module.exports = storage;