// src/lib/storage.js
const { createClient } = require('redis');
let client;
let isConnected = false;
let connectionPromise = null;

/**
 * Initialize Redis connection with improved error handling and connection management
 */
async function initializeRedis() {
  // If already connecting, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // If already connected, return the client
  if (isConnected && client) {
    return client;
  }
  
  // Create a new connection promise
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // Use the environment variables provided by Upstash/Vercel
      const redisUrl = process.env.KV_URL || process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Log connection without exposing credentials
      const sanitizedUrl = redisUrl.includes('@') 
        ? redisUrl.replace(/\/\/.*@/, '//***:***@') 
        : redisUrl;
      console.log(`Connecting to Redis at ${sanitizedUrl}...`);
      
      // Create a new client
      client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt ${retries}`);
            // Exponential backoff with max retry of 10 seconds
            return Math.min(retries * 100, 10000);
          }
        }
      });
      
      client.on('error', (err) => {
        console.error('Redis Client Error', err);
        isConnected = false;
      });
      
      client.on('ready', () => {
        console.log('Redis client ready');
        isConnected = true;
      });
      
      client.on('reconnecting', () => {
        console.log('Redis client reconnecting...');
        isConnected = false;
      });
      
      client.on('end', () => {
        console.log('Redis client connection closed');
        isConnected = false;
        connectionPromise = null;
      });
      
      await client.connect();
      isConnected = true;
      console.log('Connected to Redis successfully');
      resolve(client);
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      connectionPromise = null;
      reject(error);
    }
  });
  
  return connectionPromise;
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
  },
  
  // Ping to check connection
  async ping() {
    try {
      const redis = await initializeRedis();
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Error pinging Redis:', error);
      return false;
    }
  }
};

module.exports = storage;