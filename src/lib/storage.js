// src/lib/storage.js - Enhanced with better URL handling
const { createClient } = require('@vercel/kv');
const { createClient: createRedisClient } = require('redis');

// Track the client and connection status
let client = null;
let connectionStatus = {
  initialized: false,
  connected: false,
  lastError: null,
  lastConnectionAttempt: null
};

/**
 * Parse and convert Redis URL if needed
 * Vercel KV requires HTTPS REST URL while Redis client uses Redis protocol URL
 */
function getConnectionDetails() {
  // Get all possible connection configurations
  const kvUrl = process.env.KV_URL;
  const kvRestApiUrl = process.env.KV_REST_API_URL;
  const kvRestApiToken = process.env.KV_REST_API_TOKEN;
  const redisUrl = process.env.REDIS_URL;
  
  // Return connection config based on available variables
  if (kvRestApiUrl && kvRestApiToken) {
    // Preferred: Use REST API directly
    return {
      useVercelKv: true,
      config: {
        url: kvRestApiUrl,
        token: kvRestApiToken
      }
    };
  } else if (kvUrl && kvUrl.startsWith('https://')) {
    // If KV_URL is already in HTTPS format, use it directly
    return {
      useVercelKv: true,
      config: {
        url: kvUrl
      }
    };
  } else if (kvUrl && (kvUrl.startsWith('redis://') || kvUrl.startsWith('rediss://'))) {
    // If KV_URL is in Redis protocol format but we need Vercel KV REST API
    // Extract the host and token from the Redis URL
    try {
      // Parse Redis URL to get host and password parts
      const match = kvUrl.match(/rediss?:\/\/default:([^@]+)@([^:]+):(\d+)/);
      if (match) {
        const [, password, host, port] = match;
        // Construct the HTTPS URL for Vercel KV
        const restUrl = `https://${host}/redis/${password}`;
        
        console.log(`Converted Redis URL to REST API URL format`);
        return {
          useVercelKv: true,
          config: {
            url: restUrl
          }
        };
      }
    } catch (error) {
      console.error('Error parsing Redis URL:', error);
    }
  }
  
  // Fallback: If we have a Redis URL, use the standard Redis client
  if (redisUrl || kvUrl) {
    return {
      useVercelKv: false,
      config: {
        url: redisUrl || kvUrl
      }
    };
  }
  
  // Final fallback: We don't have any valid connection details
  return {
    useVercelKv: true,
    config: {
      url: kvUrl || kvRestApiUrl,
      token: kvRestApiToken
    }
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
      throw new Error('No KV URL configuration found. Set KV_URL or KV_REST_API_URL environment variable.');
    }
    
    // Log connection type (without sensitive details)
    console.log('KV connection type:', {
      useVercelKv: connection.useVercelKv,
      urlType: connection.config.url.startsWith('https') ? 'HTTPS' : 'Redis',
      hasToken: !!connection.config.token,
      environment: process.env.NODE_ENV
    });
    
    // Create client based on connection type
    if (connection.useVercelKv) {
      console.log('Using Vercel KV client');
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
    } else {
      console.log('Using standard Redis client');
      // Use standard Redis client for Redis protocol URLs
      client = createRedisClient({
        url: connection.config.url,
        socket: {
          reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt ${retries}`);
            return Math.min(retries * 100, 10000);
          }
        }
      });
      
      // Connect to Redis
      await client.connect();
      
      // Test connection
      const pingResult = await client.ping();
      if (pingResult !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      
      connectionStatus.initialized = true;
      connectionStatus.connected = true;
      connectionStatus.lastError = null;
      console.log('Redis connection successful');
      
      return client;
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
    return {
      ...connectionStatus,
      clientInitialized: !!client,
      connectionConfig: {
        useVercelKv: getConnectionDetails().useVercelKv,
        urlType: process.env.KV_URL?.startsWith('https') ? 'HTTPS' : 
                 process.env.KV_URL?.startsWith('redis') ? 'Redis' : 
                 process.env.KV_REST_API_URL ? 'REST API' : 'Unknown'
      }
    };
  }
};

module.exports = storage;