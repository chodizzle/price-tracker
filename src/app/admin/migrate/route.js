// src/app/api/admin/migrate/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

/**
 * Direct KV setup endpoint that bypasses our main storage module
 * Useful when troubleshooting connection issues
 */
export async function POST(request) {
  console.log('Migration endpoint called');
  try {
    // Require a secret key for security
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.ADMIN_SECRET_KEY;
    
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'ADMIN_SECRET_KEY not configured' },
        { status: 500 }
      );
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body to get connection details
    let requestBody = {};
    try {
      const bodyText = await request.text();
      // Only parse if body isn't empty
      if (bodyText && bodyText.trim()) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (error) {
      console.log('Request body parsing error:', error.message);
      // Continue with empty request body
    }
    
    const { url, restUrl, token } = requestBody;
    
    // Connection details to try
    const connectionOptions = [];
    
    // Option 1: Use provided URL from request
    if (url) {
      connectionOptions.push({
        name: 'Custom URL',
        config: { url }
      });
    }
    
    // Option 2: Use provided REST URL and token from request
    if (restUrl && token) {
      connectionOptions.push({
        name: 'Custom REST URL',
        config: { url: restUrl, token }
      });
    }
    
    // Option 3: If KV_URL is in Redis format, try to convert it
    if (process.env.KV_URL && process.env.KV_URL.startsWith('redis')) {
      try {
        const match = process.env.KV_URL.match(/rediss?:\/\/default:([^@]+)@([^:]+):(\d+)/);
        if (match) {
          const [, password, host, port] = match;
          const convertedUrl = `https://${host}/redis/${password}`;
          
          connectionOptions.push({
            name: 'Converted Redis URL',
            config: { url: convertedUrl }
          });
        }
      } catch (error) {
        console.error('Error parsing Redis URL:', error);
      }
    }
    
    // Option 4: Use environment variables
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      connectionOptions.push({
        name: 'Env REST API',
        config: {
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN
        }
      });
    }
    
    // Option 5: Use KV_URL if it's in HTTPS format
    if (process.env.KV_URL && process.env.KV_URL.startsWith('https')) {
      connectionOptions.push({
        name: 'Env KV_URL',
        config: { url: process.env.KV_URL }
      });
    }
    
    // Try each connection option
    const results = [];
    let workingClient = null;
    let workingConfig = null;
    
    for (const option of connectionOptions) {
      try {
        results.push({
          name: option.name,
          status: 'testing'
        });
        const index = results.length - 1;
        
        console.log(`Testing connection option: ${option.name}`);
        
        // Create client with this config
        const client = createClient(option.config);
        
        // Try to set a test value
        const testKey = `__test_migrate_${Date.now()}`;
        await client.set(testKey, 'test-value');
        const value = await client.get(testKey);
        await client.del(testKey);
        
        console.log(`Connection test result for ${option.name}:`, value);
        
        if (value === 'test-value') {
          results[index].status = 'success';
          workingClient = client;
          workingConfig = option;
          break; // Found a working connection!
        } else {
          results[index].status = 'value mismatch';
          results[index].error = 'Test value didn\'t match expected value';
        }
      } catch (error) {
        console.error(`Connection test failed for ${option.name}:`, error);
        if (results.length > 0) {
          const lastResult = results[results.length - 1];
          lastResult.status = 'error';
          lastResult.error = error.message;
        }
      }
    }
    
    // If we found a working connection, set up initial data
    if (workingClient) {
      try {
        // Initialize with empty price data so the app doesn't crash
        const initialPriceData = {
          eggs: {
            metadata: {
              lastUpdated: new Date().toISOString(),
              dataSource: {
                2024: 'static-file',
                2025: 'usda-api'
              }
            },
            prices: []
          },
          milk: {
            metadata: {
              lastUpdated: new Date().toISOString(),
              dataSource: {
                2024: 'usda-api',
                2025: 'usda-api'
              }
            },
            prices: []
          }
        };
        
        // Set initial price data
        await workingClient.set('price_data', JSON.stringify(initialPriceData));
        
        // Initial combined price data
        const initialCombinedData = {
          metadata: {
            lastProcessed: new Date().toISOString(),
            quantities: {
              eggs: 1,
              milk: 1,
              gasoline_regular: 1
            }
          },
          alignedPrices: [],
          basket: [],
          charts: {
            eggs: { data: [] },
            milk: { data: [] }
          }
        };
        
        // Set initial combined data
        await workingClient.set('combined_price_data', JSON.stringify(initialCombinedData));
        
        return NextResponse.json({
          success: true,
          message: 'Successfully set up initial data structure',
          connection: {
            method: workingConfig.name,
            urlType: workingConfig.config.url.startsWith('https') ? 'HTTPS' : 'Unknown'
          },
          results
        });
      } catch (error) {
        console.error('Data initialization error:', error);
        return NextResponse.json({
          success: false,
          error: `Data initialization failed: ${error.message}`,
          connection: workingConfig ? {
            method: workingConfig.name
          } : null,
          results
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Could not establish a working connection with any method',
        results,
        recommendations: [
          "Make sure you've added a Vercel KV database to your project",
          "Check that KV_URL or KV_REST_API_URL and KV_REST_API_TOKEN are set correctly in your environment variables",
          "If KV_URL is in Redis format, try updating it to an HTTPS format URL"
        ]
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Migration endpoint error:', error);
    // Ensure we return a valid JSON response
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error in migration endpoint',
      errorType: error.constructor.name,
      stack: error.stack
    }, { status: 500 });
  }
}

// Also allow GET for testing
export async function GET(request) {
  return NextResponse.json({
    message: "Use POST to migrate data. GET requests are not supported for this endpoint."
  });
}