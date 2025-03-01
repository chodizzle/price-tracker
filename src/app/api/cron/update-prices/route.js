// src/app/api/cron/update-prices/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';
import { processPrices } from '@/scripts/process-prices'; // Adapt this to async/await as well

// This function will be triggered by the Vercel Cron job
export async function GET(request) {
  try {
    // Check for a secret key to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Run data initialization process
    // You'll need to adapt your initializeAll function to work with the async storage
    const { initializeAll } = require('../../../../../init-prices');
    const result = await initializeAll();
    
    // Process the combined data
    const processedData = await processPrices();
    
    // Store the processed data
    await storage.set('combined_price_data', JSON.stringify(processedData));
    
    return NextResponse.json({
      success: true,
      message: 'Price data updated successfully',
      updated: new Date().toISOString(),
      commodities: Object.keys(processedData.charts || {})
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