const { createClient } = require('redis');
let client;
let isConnected = false;

// Initialize Redis connection
async function initializeRedis() {
  if (!isConnected) {
    client = createClient({
      url: process.env.KV_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => {
      console.error('Redis Client Error', err);
      isConnected = false;
    });
    
    await client.connect();
    isConnected = true;
    console.log('Connected to Redis');
  }
  return client;
}

// KV-like interface for consistent usage
const storage = {
  async get(key) {
    const redis = await initializeRedis();
    return redis.get(key);
  },
  
  async set(key, value) {
    const redis = await initializeRedis();
    return redis.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  
  async del(key) {
    const redis = await initializeRedis();
    return redis.del(key);
  },
  
  // Add other methods as needed
};

module.exports = storage;