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

    // Use Upstash REST API directly for simplicity
    const restApiUrl = process.env.KV_REST_API_URL;
    const restApiToken = process.env.KV_REST_API_TOKEN;
    
    if (!restApiUrl || !restApiToken) {
      return NextResponse.json({
        success: false,
        error: 'KV_REST_API_URL and KV_REST_API_TOKEN environment variables are required'
      }, { status: 500 });
    }
    
    console.log('Creating client with Upstash REST API');
    
    try {
      // Create client with REST API
      const client = createClient({
        url: restApiUrl,
        token: restApiToken
      });
      
      // Try a simple operation
      const testKey = `__test_${Date.now()}`;
      await client.set(testKey, 'test-value');
      const value = await client.get(testKey);
      await client.del(testKey);
      
      console.log('Connection test result:', value);
      
      if (value !== 'test-value') {
        return NextResponse.json({
          success: false,
          error: 'Connection test failed: value mismatch'
        }, { status: 500 });
      }
      
      console.log('Connection successful, setting up initial data structure');
      
      // Initialize with empty price data
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
        },
        gasoline_regular: {
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: {
              2024: 'eia-api',
              2025: 'eia-api'
            },
            name: 'Regular Gasoline (Gallon)'
          },
          prices: []
        }
      };
      
      // Set initial price data
      await client.set('price_data', JSON.stringify(initialPriceData));
      
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
          milk: { data: [] },
          gasoline_regular: { data: [] }
        }
      };
      
      // Set initial combined data
      await client.set('combined_price_data', JSON.stringify(initialCombinedData));
      
      return NextResponse.json({
        success: true,
        message: 'Successfully set up initial data structure',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error during initialization:', error);
      return NextResponse.json({
        success: false,
        error: `Initialization error: ${error.message}`,
        errorDetails: {
          name: error.name,
          stack: error.stack
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unhandled error in migration endpoint:', error);
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