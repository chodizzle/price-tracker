// src/lib/storage.js - Enhanced for Vercel + Upstash
const { createClient } = require('@vercel/kv');
const { createClient: createRedisClient } = require('redis');

// Flag to check which client we're using
let usingVercelKV = false;
let client = null;
let connectionPromise = null;

/**
 * Initialize storage connection
 */
async function initializeStorage() {
  // If already connecting, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }
  
  // If already connected and client exists, return the client
  if (client) {
    return client;
  }
  
  // Create a new connection promise
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // First, try to use Vercel KV (preferred for Vercel deployments)
      if (process.env.KV_URL || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
        console.log('Using Vercel KV for storage');
        
        // Vercel KV doesn't need explicit connection - just create the client
        client = createClient({
          url: process.env.KV_URL,
          token: process.env.KV_REST_API_TOKEN,
        });
        
        usingVercelKV = true;
        resolve(client);
        return;
      }
      
      // Fall back to standard Redis client
      console.log('Using Redis client for storage');
      
      // Use the environment variables
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://localhost:6379';
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      // Configure client based on what we have
      const clientOptions = {
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt ${retries}`);
            // Exponential backoff with max retry of 10 seconds
            return Math.min(retries * 100, 10000);
          }
        }
      };
      
      // Add token if available (for Upstash REST client)
      if (redisToken) {
        clientOptions.token = redisToken;
      }
      
      // Create standard Redis client
      client = createRedisClient(clientOptions);
      
      // Set up event handlers
      client.on('error', (err) => {
        console.error('Redis client error:', err);
      });
      
      client.on('ready', () => {
        console.log('Redis client ready');
      });
      
      // Connect to Redis
      await client.connect();
      
      // Verify connection with ping
      const pingResult = await client.ping();
      if (pingResult !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      
      console.log('Connected to Redis successfully');
      usingVercelKV = false;
      resolve(client);
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      client = null;
      connectionPromise = null;
      reject(error);
    }
  });
  
  return connectionPromise;
}

// Normalize Redis API across different clients
const storage = {
  async get(key) {
    try {
      const storageClient = await initializeStorage();
      return storageClient.get(key);
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      throw error;
    }
  },
  
  async set(key, value) {
    try {
      const storageClient = await initializeStorage();
      // Make sure value is a string
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      return storageClient.set(key, stringValue);
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      throw error;
    }
  },
  
  async del(key) {
    try {
      const storageClient = await initializeStorage();
      // Vercel KV uses .del(), Redis client uses .del()
      return storageClient.del(key);
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  },
  
  async keys(pattern) {
    try {
      const storageClient = await initializeStorage();
      
      if (usingVercelKV) {
        // Vercel KV doesn't support pattern matching, only prefixes
        // For simplicity, we'll just assume * means get all keys
        // You can enhance this to handle more patterns if needed
        if (pattern === '*') {
          return storageClient.keys();
        } else {
          const prefix = pattern.replace(/\*$/, '');
          return storageClient.keys({ prefix });
        }
      } else {
        return storageClient.keys(pattern);
      }
    } catch (error) {
      console.error(`Error listing keys with pattern ${pattern}:`, error);
      return [];
    }
  },
  
  async ping() {
    try {
      const storageClient = await initializeStorage();
      
      if (usingVercelKV) {
        // Vercel KV doesn't have ping, so check if a simple operation works
        await storageClient.get('__ping_test__');
        return true;
      } else {
        const result = await storageClient.ping();
        return result === 'PONG';
      }
    } catch (error) {
      console.error('Error pinging storage:', error);
      return false;
    }
  },
  
  // Returns information about the client type
  getClientInfo() {
    return {
      type: usingVercelKV ? 'vercel-kv' : 'redis',
      initialized: !!client
    };
  }
};

module.exports = storage;