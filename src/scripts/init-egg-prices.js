// src/scripts/init-egg-prices.js
const fs = require('fs');
const path = require('path');
const { priceDataManager } = require('../lib/priceDataManager');

// Load environment variables for when running this script directly
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// Path to 2024 egg prices file
const EGG_PRICES_PATH = path.join(process.cwd(), '2024_egg_prices');

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
 * Parse 2024 egg prices from the text file
 */
async function parse2024EggPrices() {
  try {
    console.log('Parsing 2024 egg prices from:', EGG_PRICES_PATH);
    
    // Check if file exists
    if (!fs.existsSync(EGG_PRICES_PATH)) {
      console.error(`Egg prices file not found at: ${EGG_PRICES_PATH}`);
      return [];
    }
    
    // Read the file
    const text = await fs.promises.readFile(EGG_PRICES_PATH, 'utf8');
    
    // Split by report sections
    const reports = text.split('WA_PY001');
    
    const prices = [];
    
    for (const report of reports) {
      if (!report.trim()) continue;
      
      // Extract date
      const dateMatch = report.match(/(\w+\.\s+\w+\s+\d+,\s+\d{4})|(\w+,\s+\w+\s+\d+,\s+\d{4})|(\w+\s+\d+,\s+\d{4})/);
      if (!dateMatch) {
        const altDateMatch = report.match(/([A-Za-z]{3}\.\s+\d{2},\s+\d{4})|(\d{2}-[A-Za-z]{3}-\d{2})/);
        if (!altDateMatch) continue;
      }
      
      // Extract the date and clean it up
      let dateStr = dateMatch ? dateMatch[0] : '';
      if (!dateStr) continue;
      
      let reportDate;
      try {
        reportDate = new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        console.warn('Could not parse date:', dateStr);
        continue;
      }
      
      // Find COMBINED REGIONAL section for LARGE eggs
      const lines = report.split('\n');
      let foundCombined = false;
      let largePrice = null;
      
      for (const line of lines) {
        if (line.includes('COMBINED REGIONAL')) {
          foundCombined = true;
          
          // Try to extract the LARGE price
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            // Price is usually the third column
            // Format is typically: COMBINED REGIONAL   423.28   416.92   379.57
            const largeIndex = parts.findIndex(p => /^\d+\.\d+$/.test(p));
            if (largeIndex >= 0 && largeIndex + 1 < parts.length) {
              // Use the second number (LARGE)
              largePrice = parseFloat(parts[largeIndex + 1]) / 100; // Convert cents to dollars
            }
          }
          break;
        }
      }
      
      if (foundCombined && largePrice !== null) {
        prices.push({
          date: reportDate,
          price: largePrice,
          minPrice: largePrice * 0.95, // Estimate min price as 5% below average
          maxPrice: largePrice * 1.05  // Estimate max price as 5% above average
        });
      }
    }
    
    // Sort prices by date
    return prices.sort((a, b) => a.date.localeCompare(b.date));
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
    const dataDir = path.join(process.cwd(), 'data', 'raw');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `egg_prices_${timestamp}.json`;
    
    // Write to timestamp-specific file
    fs.writeFileSync(
      path.join(dataDir, filename),
      JSON.stringify(data, null, 2)
    );
    
    // Also update the latest file
    fs.writeFileSync(
      path.join(dataDir, 'egg_prices_raw.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log(`Saved raw egg data to ${filename}`);
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
    
    // 1. Parse 2024 egg price data from static file
    const prices2024 = await parse2024EggPrices();
    console.log(`Parsed ${prices2024.length} egg price records from 2024 static file`);
    
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
    
    // 5. Update data in priceDataManager
    if (!priceDataManager.data.eggs) {
      priceDataManager.data.eggs = {
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
      priceDataManager.data.eggs.metadata.dataSource = {
        ...priceDataManager.data.eggs.metadata.dataSource,
        2024: 'static-file',
        2025: 'usda-api'
      };
      
      priceDataManager.data.eggs.metadata.baseline = {
        ...priceDataManager.data.eggs.metadata.baseline,
        2024: baseline
      };
      
      // Update last updated timestamp
      priceDataManager.data.eggs.metadata.lastUpdated = new Date().toISOString();
    }
    
    // 6. Add all prices
    priceDataManager.addPriceData('eggs', allPrices);
    
    console.log('Successfully initialized egg price data');
    return { baseline, prices: allPrices };
  } catch (error) {
    console.error('Error initializing egg prices:', error);
    throw error;
  }
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