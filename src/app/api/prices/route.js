// src/app/api/prices/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the combined-prices.json file
    const filePath = path.join(process.cwd(), 'data', 'combined-prices.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Combined price data not available' },
        { status: 404 }
      );
    }
    
    // Read and parse the file
    const fileData = await fs.promises.readFile(filePath, 'utf8');
    const priceData = JSON.parse(fileData);
    
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