// src/scripts/init-milk-prices.js
const fs = require('fs');
const path = require('path');
const { priceDataManager } = require('../lib/priceDataManager');
// Load environment variables for when running this script directly
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// USDA API configuration
const USDA_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2';
const API_KEY = process.env.USDA_API_KEY;
if (!API_KEY) {
  console.warn('USDA_API_KEY not found in environment variables. Check .env.local file.');
}
const MILK_REPORT_ID = '2995'; // National Retail Report - Dairy

/**
 * Helper to convert YYYY-MM-DD to MM/DD/YYYY
 */
function formatDateForUSDA(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

/**
 * Fetch milk prices from USDA API for a date range
 */
async function fetchMilkPrices(fromDate, toDate) {
  try {
    console.log(`Fetching milk prices from ${fromDate} to ${toDate}...`);
    
    // Format dates for USDA API
    const formattedFromDate = formatDateForUSDA(fromDate);
    const formattedToDate = formatDateForUSDA(toDate);
    
    // Build URL
    const pricesUrl = `${USDA_BASE_URL}/reports/${MILK_REPORT_ID}/Report Details`;
    const queryParams = `commodity=Milk;package=Gallon;organic=No;region=National;report_begin_date=${formattedFromDate}:${formattedToDate}`;
    const params = new URLSearchParams({ 'q': queryParams });
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
    
    // Save raw response for later use
    await saveMilkRawResponse(data);
    
    // Process and transform the data
    const milkPrices = data.results
      .filter(item => 
        item.region === 'National' && 
        item.package === 'Gallon' && 
        item.organic === 'No' &&
        item.wtd_avg_price !== null
      )
      .map(item => ({
        date: new Date(item.report_begin_date).toISOString().split('T')[0],
        price: parseFloat(item.wtd_avg_price),
        minPrice: parseFloat(item.price_min || item.wtd_avg_price),
        maxPrice: parseFloat(item.price_max || item.wtd_avg_price),
        storeCount: parseInt(item.store_count || 0)
      }));
    
    // Sort by date
    return milkPrices.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching milk prices:', error);
    throw error;
  }
}

/**
 * Save raw milk API response
 */
async function saveMilkRawResponse(data) {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'raw');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `milk_prices_${timestamp}.json`;
    
    // Write to timestamp-specific file
    fs.writeFileSync(
      path.join(dataDir, filename),
      JSON.stringify(data, null, 2)
    );
    
    // Also update the latest file
    fs.writeFileSync(
      path.join(dataDir, 'milk_prices_raw.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log(`Saved raw milk data to ${filename}`);
  } catch (error) {
    console.error('Error saving raw milk data:', error);
  }
}

/**
 * Calculate baseline statistics for 2024 milk prices
 */
function calculateBaseline(prices) {
  // Filter for only 2024 prices
  const prices2024 = prices.filter(p => p.date.startsWith('2024'));
  
  if (prices2024.length === 0) {
    console.warn('No 2024 milk prices found for baseline calculation');
    return {
      annualMean: 0,
      min: 0,
      max: 0
    };
  }
  
  const values = prices2024.map(p => p.price);
  return {
    annualMean: values.reduce((sum, price) => sum + price, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Initialize milk prices data
 */
async function initializeMilkPrices() {
  try {
    console.log('Initializing milk prices data...');
    
    if (!API_KEY) {
      console.warn('USDA API key not configured, using mock data');
      // Return empty result if no API key
      return { prices: [], baseline: null };
    }
    
    // Set date range from Jan 2024 to current
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 7); // Subtract a week to ensure data is available
    
    const fromDate = new Date('2024-01-01');
    
    // Format dates
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];
    
    // Fetch milk prices
    const prices = await fetchMilkPrices(fromDateStr, toDateStr);
    console.log(`Fetched ${prices.length} milk price records`);
    
    if (prices.length === 0) {
      console.warn('No milk prices found');
      return { prices: [], baseline: null };
    }
    
    // Calculate baseline stats
    const baseline = calculateBaseline(prices);
    console.log('2024 Baseline stats:', baseline);
    
    // Update data in priceDataManager
    if (!priceDataManager.data.milk) {
      priceDataManager.data.milk = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2024: 'usda-api',
            2025: 'usda-api'
          },
          baseline: baseline ? { 2024: baseline } : {}
        },
        prices: []
      };
    } else {
      // Update metadata and baseline
      priceDataManager.data.milk.metadata.dataSource = {
        ...priceDataManager.data.milk.metadata.dataSource,
        2024: 'usda-api'
      };
      
      if (baseline) {
        priceDataManager.data.milk.metadata.baseline = {
          ...priceDataManager.data.milk.metadata.baseline,
          2024: baseline
        };
      }
    }
    
    // Add all milk prices
    priceDataManager.addPriceData('milk', prices);
    
    console.log('Successfully initialized milk price data');
    return { baseline, prices };
  } catch (error) {
    console.error('Error initializing milk prices:', error);
    throw error;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeMilkPrices()
    .then(() => console.log('Milk prices initialization complete!'))
    .catch(error => {
      console.error('Failed to initialize milk prices:', error);
      process.exit(1);
    });
}

module.exports = { initializeMilkPrices, fetchMilkPrices };