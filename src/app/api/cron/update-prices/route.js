// src/app/api/cron/update-prices/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

// This function will be triggered by the Vercel Cron job or manually for initialization
export async function GET(request) {
  try {
    // If this is a manual initialization, check for a secret key
    const authHeader = request.headers.get('authorization');
    const isManualInit = authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Import initialization functions dynamically with proper ES module syntax
    const initPricesModule = await import('@/scripts/init-prices');
    const processPricesModule = await import('@/scripts/process-prices');
    
    const { initializeAll } = initPricesModule;
    const { processPrices } = processPricesModule;
    
    console.log('Starting price data initialization...');
    await initializeAll();
    
    console.log('Processing combined price data...');
    const processedData = await processPrices();
    
    // Store the processed data
    await storage.set('combined_price_data', JSON.stringify(processedData));
    
    return NextResponse.json({
      success: true,
      message: 'Price data updated successfully',
      updated: new Date().toISOString(),
      commodities: Object.keys(processedData.charts || {}),
      isManualInit
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update price data',
      error: error.message
    }, { status: 500 });
  }
}

// Allow POST method for manual initialization
export const POST = GET;