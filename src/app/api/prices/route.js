// src/app/api/prices/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

export async function GET() {
  try {
    // Get the combined price data from storage
    const rawData = await storage.get('combined_price_data');
    
    if (!rawData) {
      return NextResponse.json(
        { success: false, error: 'Combined price data not available' },
        { status: 404 }
      );
    }
    
    // Parse the data
    const priceData = JSON.parse(rawData);
    
    // Return the data
    return NextResponse.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error('Error reading combined price data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read combined price data' },
      { status: 500 }
    );
  }
}