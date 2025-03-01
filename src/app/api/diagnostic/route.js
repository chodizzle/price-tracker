// src/app/api/diagnostic/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

/**
 * Diagnostic API endpoint to check system health
 */
export async function GET() {
  try {
    // Check environment
    const environment = {
      node_version: process.version,
      env: process.env.NODE_ENV || 'development',
      kv_configured: !!process.env.KV_URL,
      usda_key_configured: !!process.env.USDA_API_KEY,
      eia_key_configured: !!process.env.EIA_API_KEY,
      admin_key_configured: !!process.env.ADMIN_SECRET_KEY,
      cron_key_configured: !!process.env.CRON_SECRET,
    };
    
    // Check Redis/KV connection
    let redisStatus = "unknown";
    let redisError = null;
    
    try {
      const pingResult = await storage.ping();
      redisStatus = pingResult ? "connected" : "failed";
    } catch (error) {
      redisStatus = "error";
      redisError = error.message;
    }
    
    // Check if price data exists
    let rawPriceData = null;
    let combinedPriceData = null;
    
    try {
      rawPriceData = await storage.get('price_data');
      combinedPriceData = await storage.get('combined_price_data');
    } catch (error) {
      console.error('Error checking data:', error);
    }
    
    // Format response
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment,
      redis: {
        status: redisStatus,
        error: redisError
      },
      data: {
        raw_data_exists: !!rawPriceData,
        combined_data_exists: !!combinedPriceData,
        raw_data_size: rawPriceData ? rawPriceData.length : 0,
        combined_data_size: combinedPriceData ? combinedPriceData.length : 0
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}