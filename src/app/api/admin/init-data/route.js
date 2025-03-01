// src/app/api/admin/init-data/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

// Dynamically import initialization functions to avoid bundling issues
async function runInitialization() {
  try {
    // Import the initialization function
    const { initializeAll } = await import('@/scripts/init-prices');
    const { processPrices } = await import('@/scripts/process-prices');
    
    // Run initialization
    console.log('Starting price data initialization...');
    await initializeAll();
    
    // Process the data
    console.log('Processing price data...');
    const result = await processPrices();
    
    return {
      success: true,
      message: 'Data initialized successfully',
      stats: {
        commodities: Object.keys(result.charts),
        basketPoints: result.basket.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Initialization error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function GET(request) {
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
  
  // Run the initialization
  const result = await runInitialization();
  
  return NextResponse.json(result, {
    status: result.success ? 200 : 500
  });
}

// Also allow POST method
export const POST = GET;