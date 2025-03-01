// src/scripts/init-egg-prices.js
const path = require('path');
const { getPriceDataManager } = require('../lib/priceDataManager');
const storage = require('../lib/storage');

// Load environment variables for when running this script directly
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// USDA API configuration
const USDA_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2';
const API_KEY = process.env.USDA_API_KEY;
if (!API_KEY) {
  console.warn('USDA_API_KEY not found in environment variables. Check .env.local file.');
}
const EGG_REPORT_ID = '2848'; // Weekly Shell Eggs

/**
 * Helper to convert YYYY-MM-DD to MM/DD/YYYY
 */
function formatDateForUSDA(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

/**
 * Parse 2024 egg prices from static data
 */
async function parse2024EggPrices() {
  try {
    console.log('Parsing 2024 egg prices from static data');
    
    // For Vercel deployment, we'll need to provide this data via a different mechanism
    // This is a simplified version that returns mock data for 2024
    // In a real scenario, you'd fetch this from your storage or a database
    
    // Example static data for 2024
    const staticPrices = [
      { date: '2024-01-05', price: 2.2968, minPrice: 2.18196, maxPrice: 2.4116400000000002 },
      { date: '2024-01-12', price: 2.1968, minPrice: 2.08696, maxPrice: 2.3066400000000002 },
      { date: '2024-01-19', price: 1.9168, minPrice: 1.82096, maxPrice: 2.01264 },
      { date: '2024-01-26', price: 1.9768999999999999, minPrice: 1.8780549999999998, maxPrice: 2.075745 },
      { date: '2024-02-02', price: 2.4369, minPrice: 2.315055, maxPrice: 2.558745 },
      // Add more 2024 data points as needed
    ];
    
    console.log(`Generated ${staticPrices.length} static egg price records for 2024`);
    
    // Return the static prices
    return staticPrices;
  } catch (error) {
    console.error('Error parsing 2024 egg prices:', error);
    throw error;
  }
}

/**
 * Fetch current egg prices from USDA API for a date range
 */
async function fetchCurrentEggPrices(fromDate, toDate) {
  try {
    console.log(`Fetching egg prices from ${fromDate} to ${toDate}...`);
    
    // Format dates for USDA API
    const formattedFromDate = formatDateForUSDA(fromDate);
    const formattedToDate = formatDateForUSDA(toDate);
    
    // Build URL
    const pricesUrl = `${USDA_BASE_URL}/reports/${EGG_REPORT_ID}/Report Detail Simple`;
    const params = new URLSearchParams({
      'q': `report_begin_date=${formattedFromDate}:${formattedToDate}`
    });
    const fullUrl = `${pricesUrl}?${params.toString()}`;
    
    console.log('Making request to:', fullUrl);
    
    // Make the request
    const pricesResponse = await fetch(fullUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(API_KEY + ':').toString('base64')}`,
        'Accept': 'application/json'
      }
    });
    
    if (!pricesResponse.ok) {
      throw new Error(`USDA API error: ${pricesResponse.status}`);
    }
    
    // Parse the response
    const data = await pricesResponse.json();
    
    // Save raw response for debugging
    await saveRawResponse(data);
    
    // Process and transform the data - filter for National Large White Eggs
    const eggPrices = data.results
      .filter(item => 
        item.region === 'National' && 
        item.class === 'Large' && 
        item.color === 'White' &&
        item.environment === 'Caged' &&
        item.delivery === 'Delivered Warehouse' &&
        item.grade === 'Grade A'
      )
      .map(item => ({
        date: new Date(item.report_end_date || item.report_begin_date).toISOString().split('T')[0],
        price: parseFloat(item.avg_price) / 100,  // Convert cents to dollars
        minPrice: parseFloat(item.price_low) / 100,
        maxPrice: parseFloat(item.price_high) / 100
      }));
    
    console.log(`Fetched ${eggPrices.length} current egg price records`);
    
    // Sort by date
    return eggPrices.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching current egg prices:', error);
    throw error;
  }
}

/**
 * Save raw API response for debugging
 */
async function saveRawResponse(data) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `egg_prices_${timestamp}`;
    
    // Save to storage
    await storage.set(key, JSON.stringify(data));
    
    // Also update the latest version
    await storage.set('egg_prices_raw', JSON.stringify(data));
    
    console.log(`Saved raw egg data with key: ${key}`);
  } catch (error) {
    console.error('Error saving raw egg data:', error);
  }
}

/**
 * Calculate baseline statistics for 2024 egg prices
 */
function calculateBaseline(prices) {
  if (!prices || prices.length === 0) {
    return {
      annualMean: 0,
      min: 0,
      max: 0
    };
  }
  
  const values = prices.map(p => p.price);
  return {
    annualMean: values.reduce((sum, price) => sum + price, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Initialize egg prices data
 */
async function initializeEggPrices() {
  try {
    console.log('Initializing egg prices data...');
    
    // 1. Parse 2024 egg price data from static source
    const prices2024 = await parse2024EggPrices();
    console.log(`Parsed ${prices2024.length} egg price records from 2024 static data`);
    
    // 2. Fetch current egg prices from USDA API for 2025
    let prices2025 = [];
    if (API_KEY) {
      try {
        const startDate = '2025-01-01';
        const today = new Date();
        today.setDate(today.getDate() - 7); // Subtract a week to ensure data is available
        const endDate = today.toISOString().split('T')[0];
        
        prices2025 = await fetchCurrentEggPrices(startDate, endDate);
        console.log(`Fetched ${prices2025.length} egg price records from 2025 via USDA API`);
      } catch (apiError) {
        console.error('Failed to fetch 2025 egg prices from API:', apiError);
      }
    } else {
      console.warn('Skipping 2025 egg prices fetch - API key not available');
    }
    
    // 3. Combine all prices
    const allPrices = [...prices2024, ...prices2025].sort((a, b) => 
      a.date.localeCompare(b.date)
    );
    
    if (allPrices.length === 0) {
      console.error('No egg prices found in either 2024 data file or USDA API');
      return { prices: [], baseline: null };
    }
    
    // 4. Calculate baseline stats for 2024
    const baseline = calculateBaseline(prices2024);
    console.log('2024 Baseline stats:', baseline);
    
    // 5. Get data from storage for updating
    const currentData = await storage.get('price_data');
    let data = currentData ? JSON.parse(currentData) : {};
    
    // Initialize or update the eggs section
    if (!data.eggs) {
      data.eggs = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2024: 'static-file',
            2025: 'usda-api'
          },
          baseline: {
            2024: baseline
          }
        },
        prices: []
      };
    } else {
      // Update metadata and baseline
      data.eggs.metadata.dataSource = {
        ...data.eggs.metadata.dataSource,
        2024: 'static-file',
        2025: 'usda-api'
      };
      
      data.eggs.metadata.baseline = {
        ...data.eggs.metadata.baseline,
        2024: baseline
      };
      
      // Update last updated timestamp
      data.eggs.metadata.lastUpdated = new Date().toISOString();
    }
    
    // 6. Add all prices
    // Check for existing dates to avoid duplicates
    const existingDates = new Set(data.eggs.prices?.map(p => p.date) || []);
    const newPrices = allPrices.filter(p => !existingDates.has(p.date));
    
    if (newPrices.length > 0) {
      // Add adjusted dates to new prices
      const pricesToAdd = newPrices.map(p => ({
        ...p,
        adj_date: getNearestFriday(p.date)
      }));
      
      // Merge with existing prices and sort
      data.eggs.prices = [
        ...(data.eggs.prices || []),
        ...pricesToAdd
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Save the updated data
      await storage.set('price_data', JSON.stringify(data));
      console.log(`Added ${newPrices.length} new egg prices`);
    } else {
      console.log('No new egg prices to add');
    }
    
    console.log('Successfully initialized egg price data');
    return { baseline, prices: allPrices };
  } catch (error) {
    console.error('Error initializing egg prices:', error);
    throw error;
  }
}

/**
 * Gets the nearest Friday for a date, preferring the current Friday if it is one,
 * otherwise using the previous Friday. Never crosses year boundaries.
 */
function getNearestFriday(dateStr) {
  // Special case for 2024 Avg
  if (dateStr === '2024 Avg') return dateStr;
  
  // Parse the date, using noon UTC to avoid timezone issues
  const date = new Date(dateStr + 'T12:00:00Z');
  const originalYear = date.getUTCFullYear();
  
  // If already a Friday, return as is
  if (date.getUTCDay() === 5) {
    return dateStr;
  }
  
  // Calculate days to go back to previous Friday
  let daysToSubtract = date.getUTCDay();
  if (daysToSubtract < 5) {
    // For days 0-4 (Sun-Thu), go back by day + 2 (except Sunday)
    daysToSubtract = daysToSubtract === 0 ? 2 : daysToSubtract + 2;
  } else {
    // For day 6 (Saturday), go back 1 day
    daysToSubtract = 1;
  }
  
  // Create a new date by subtracting days
  const adjustedDate = new Date(date);
  adjustedDate.setUTCDate(date.getUTCDate() - daysToSubtract);
  
  // Check if we've crossed a year boundary
  if (adjustedDate.getUTCFullYear() !== originalYear) {
    // If crossing year boundary, use the original date
    return dateStr;
  }
  
  // Format as YYYY-MM-DD
  return adjustedDate.toISOString().split('T')[0];
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeEggPrices()
    .then(() => console.log('Egg prices initialization complete!'))
    .catch(error => {
      console.error('Failed to initialize egg prices:', error);
      process.exit(1);
    });
}

module.exports = { initializeEggPrices, parse2024EggPrices, fetchCurrentEggPrices };