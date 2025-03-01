// src/app/api/status/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

/**
 * Status API endpoint to check system health
 */
export async function GET() {
  try {
    // Check environment
    const environment = {
      timestamp: new Date().toISOString(),
      node_env: process.env.NODE_ENV,
      kv_url_configured: !!process.env.KV_URL,
      usda_api_key_configured: !!process.env.USDA_API_KEY,
      eia_api_key_configured: !!process.env.EIA_API_KEY,
      cron_secret_configured: !!process.env.CRON_SECRET,
      admin_secret_key_configured: !!process.env.ADMIN_SECRET_KEY,
    };
    
    // Check Redis connection
    let redisStatus = "unknown";
    let redisError = null;
    
    try {
      const pingResult = await storage.ping();
      redisStatus = pingResult ? "connected" : "failed";
    } catch (error) {
      redisStatus = "error";
      redisError = error.message;
    }
    
    // Check keys in Redis
    let keys = [];
    try {
      if (redisStatus === "connected") {
        keys = await storage.keys('*');
        if (!Array.isArray(keys)) {
          keys = []; 
        }
      }
    } catch (error) {
      console.error('Error listing keys:', error);
    }
    
    // Check if key data exists
    let hasPriceData = false;
    let hasCombinedData = false;
    
    for (const key of keys) {
      if (key === 'price_data') hasPriceData = true;
      if (key === 'combined_price_data') hasCombinedData = true;
    }
    
    // Gather final status
    const status = {
      ok: redisStatus === "connected",
      environment,
      redis: {
        status: redisStatus,
        error: redisError,
        keys: keys.length,
        keyList: keys
      },
      data: {
        hasPriceData,
        hasCombinedData
      }
    };
    
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}