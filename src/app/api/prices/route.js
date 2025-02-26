// src/app/api/prices/route.js
const { NextResponse } = require('next/server');
const fs = require('fs').promises;
const path = require('path');

// Path to the prices.json file
const PRICES_FILE = path.join(process.cwd(), 'data', 'prices.json');

/**
 * API route to get price data from the local prices.json file
 */
async function GET(request) {
  try {
    // Read the prices data from file
    const fileData = await fs.readFile(PRICES_FILE, 'utf8');
    const pricesData = JSON.parse(fileData);
    
    // Get commodity from query string (optional - defaults to all commodities)
    const { searchParams } = new URL(request.url);
    const commodity = searchParams.get('commodity')?.toLowerCase();
    
    // If a specific commodity is requested, return only that data
    if (commodity && pricesData[commodity]) {
      return NextResponse.json({
        success: true,
        data: { [commodity]: pricesData[commodity] }
      });
    }
    
    // Otherwise return all commodity data
    return NextResponse.json({
      success: true,
      data: pricesData
    });
  } catch (error) {
    console.error('Error reading prices data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read price data' },
      { status: 500 }
    );
  }
}

module.exports = { GET };