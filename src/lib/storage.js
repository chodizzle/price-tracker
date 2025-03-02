// src/lib/storage.js - Enhanced specifically for Upstash with Vercel
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
 * Get connection configuration
 * Prioritizing Upstash REST API URL and token
 */
function getConnectionDetails() {
  // Get Upstash REST API connection variables
  const restApiUrl = process.env.KV_REST_API_URL;
  const restApiToken = process.env.KV_REST_API_TOKEN;
  
  // Check for Upstash REST API configuration (preferred for Vercel)
  if (restApiUrl && restApiToken) {
    return {
      config: {
        url: restApiUrl,
        token: restApiToken
      },
      type: 'upstash-rest'
    };
  }
  
  // Fallback to KV_URL if present (but log a warning)
  if (process.env.KV_URL) {
    console.warn('Using KV_URL instead of KV_REST_API_URL and KV_REST_API_TOKEN. ' +
                'For Upstash with Vercel, it is recommended to use the REST API configuration.');
    
    return {
      config: {
        url: process.env.KV_URL
      },
      type: 'kv-url'
    };
  }
  
  // No valid configuration
  return {
    config: {},
    type: 'none'
  };
}

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
  
  // Determine the connection configuration
  const connection = getConnectionDetails();
  
  try {
    // Check if we have the minimal required configuration
    if (!connection.config.url) {
      throw new Error('No KV configuration found. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.');
    }
    
    // Log connection type (without sensitive details)
    console.log('KV connection type:', connection.type);
    
    // Create Vercel KV client
    client = createClient(connection.config);
    
    // Test a simple operation to verify connection
    try {
      const pingResult = await client.get('__ping_test__');
      console.log('Vercel KV ping result:', pingResult !== undefined);
      
      connectionStatus.initialized = true;
      connectionStatus.connected = true;
      connectionStatus.lastError = null;
      console.log('KV storage connection successful');
      
      return client;
    } catch (pingError) {
      throw new Error(`Vercel KV connection test failed: ${pingError.message}`);
    }
  } catch (error) {
    connectionStatus.lastError = {
      message: error.message,
      timestamp: new Date().toISOString()
    };
    console.error('Failed to initialize storage:', error);
    
    // Cleanup
    client = null;
    connectionStatus.initialized = false;
    connectionStatus.connected = false;
    
    throw error;
  }
}

// Normalize Redis API with better error handling
const storage = {
  async get(key) {
    try {
      const storageClient = await initializeStorage();
      const result = await storageClient.get(key);
      
      // If result is undefined or null, return null consistently
      if (result === undefined || result === null) {
        return null;
      }
      
      // If the result is already an object (not a string), convert it to string
      if (typeof result === 'object' && result !== null) {
        console.log(`Warning: KV returned an object for key ${key}, stringifying`);
        return JSON.stringify(result);
      }
      
      return result;
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
      
      // Try a simple get operation
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
    const connection = getConnectionDetails();
    return {
      ...connectionStatus,
      clientInitialized: !!client,
      connectionConfig: {
        type: connection.type,
        hasToken: !!connection.config.token
      }
    };
  }
};

module.exports = storage;