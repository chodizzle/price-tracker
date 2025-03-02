// src/app/api/admin/check-updates/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

// This function checks if new data might be available from our data sources
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
  
  try {
    // Get raw price data
    const rawData = await storage.get('price_data');
    
    if (!rawData) {
      return NextResponse.json(
        { success: false, error: 'Price data not found' },
        { status: 404 }
      );
    }
    
    const priceData = JSON.parse(rawData);
    
    // Get latest dates for each commodity
    const latestDates = {};
    const dataAges = {};
    const recommendations = [];
    
    const now = new Date();
    
    for (const commodity of Object.keys(priceData)) {
      const prices = priceData[commodity].prices;
      if (prices && prices.length > 0) {
        // Sort by date in descending order to get the most recent
        const sortedPrices = [...prices].sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        
        // Get latest date that's not "2024 Avg"
        const latestPrice = sortedPrices.find(p => p.date !== '2024 Avg');
        
        if (latestPrice) {
          latestDates[commodity] = latestPrice.date;
          
          // Calculate how old the data is
          const latestDate = new Date(latestPrice.date);
          const ageInDays = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));
          dataAges[commodity] = ageInDays;
          
          // Add recommendation if data is outdated
          if (ageInDays > 7) {
            recommendations.push(`${commodity}: Data is ${ageInDays} days old, consider updating`);
          }
        }
      }
    }
    
    // Format update recommendations
    let updateSuggestion = null;
    if (recommendations.length > 0) {
      updateSuggestion = {
        message: "Some data appears to be outdated",
        recommendations: recommendations,
        updateEndpoint: "/api/cron/update-prices"
      };
    }
    
    return NextResponse.json({
      success: true,
      latestDates,
      dataAges,
      currentTime: now.toISOString(),
      updateRecommendation: updateSuggestion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also allow POST for compatibility
export const POST = GET;