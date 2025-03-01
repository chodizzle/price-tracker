// src/lib/storage.js - Enhanced with better debugging
const { createClient } = require('@vercel/kv');

// Track the client and connection status
let client = null;
let connectionStatus = {
  initialized: false,
  connected: false,
  lastError: null,
  lastConnectionAttempt: null
};

/**
 * Initialize storage connection with better error handling
 */
async function initializeStorage() {
  // If already connected, return the client
  if (client && connectionStatus.connected) {
    return client;
  }
  
  connectionStatus.lastConnectionAttempt = new Date().toISOString();
  console.log('Initializing KV storage connection...');
  
  try {
    // Check for required environment variables
    if (!process.env.KV_URL && !process.env.KV_REST_API_URL) {
      throw new Error('Neither KV_URL nor KV_REST_API_URL environment variable is set');
    }
    
    // Log connection information (without sensitive details)
    console.log('KV connection info:', {
      usingKvUrl: !!process.env.KV_URL,
      usingRestApi: !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN,
      environment: process.env.NODE_ENV
    });
    
    // Create Vercel KV client
    client = createClient({
      url: process.env.KV_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    // Test the connection with a simple operation
    await client.ping();
    
    connectionStatus.initialized = true;
    connectionStatus.connected = true;
    connectionStatus.lastError = null;
    console.log('KV storage connection successful');
    
    return client;
  } catch (error) {
    connectionStatus.lastError = {
      message: error.message,
      timestamp: new Date().toISOString()
    };
    console.error('Failed to initialize KV storage:', error);
    throw error;
  }
}

// Normalize Redis API with better error handling
const storage = {
  async get(key) {
    try {
      const storageClient = await initializeStorage();
      return await storageClient.get(key);
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
      return await storageClient.set(key, stringValue);
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      throw error;
    }
  },
  
  async del(key) {
    try {
      const storageClient = await initializeStorage();
      return await storageClient.del(key);
    } catch (error) {
      console.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  },
  
  async keys(pattern = '*') {
    try {
      const storageClient = await initializeStorage();
      
      // Vercel KV's keys() method works differently than Redis' KEYS command
      // It accepts an options object with a prefix property
      if (pattern === '*') {
        return await storageClient.keys();
      } else {
        const prefix = pattern.replace(/\*$/, '');
        return await storageClient.keys({ prefix });
      }
    } catch (error) {
      console.error(`Error listing keys with pattern ${pattern}:`, error);
      return [];
    }
  },
  
  async ping() {
    try {
      const storageClient = await initializeStorage();
      
      // Vercel KV doesn't have a ping method, so we use a small get operation
      await storageClient.get('__ping_test__');
      return true;
    } catch (error) {
      console.error('Error pinging storage:', error);
      connectionStatus.lastError = {
        message: error.message,
        timestamp: new Date().toISOString()
      };
      connectionStatus.connected = false;
      return false;
    }
  },
  
  // Get connection status information
  getStatus() {
    return {
      ...connectionStatus,
      clientInitialized: !!client
    };
  }
};

module.exports = storage;