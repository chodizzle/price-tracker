// src/scripts/init-gasoline-prices.js
const fs = require('fs');
const path = require('path');
const { priceDataManager } = require('../lib/priceDataManager');
const EIAGasolineFetcher = require('../lib/eiaGasolineFetcher');

// Load environment variables
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// EIA API configuration
const EIA_API_KEY = process.env.EIA_API_KEY;
if (!EIA_API_KEY) {
  console.warn('EIA_API_KEY not found in environment variables. Check .env.local file.');
}

/**
 * Save raw gasoline price data for debugging
 */
async function saveRawResponse(data) {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'raw');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `gasoline_prices_${timestamp}.json`;
    
    // Write to timestamp-specific file
    fs.writeFileSync(
      path.join(dataDir, filename),
      JSON.stringify(data, null, 2)
    );
    
    // Also update the latest file
    fs.writeFileSync(
      path.join(dataDir, 'gasoline_prices_raw.json'),
      JSON.stringify(data, null, 2)
    );
    
    console.log(`Saved raw gasoline data to ${filename}`);
  } catch (error) {
    console.error('Error saving raw gasoline data:', error);
  }
}

/**
 * Calculate baseline statistics
 */
function calculateBaseline(prices) {
  if (!prices || prices.length === 0) {
    console.warn('No prices found for baseline calculation');
    return {
      annualMean: 0,
      min: 0,
      max: 0
    };
  }
  
  // Filter for only 2024 prices
  const pricesFor2024 = prices.filter(p => p.date.startsWith('2024'));
  
  if (pricesFor2024.length === 0) {
    console.warn('No 2024 prices found for baseline calculation');
    return {
      annualMean: 0,
      min: 0,
      max: 0
    };
  }
  
  const values = pricesFor2024.map(p => p.price);
  return {
    annualMean: values.reduce((sum, price) => sum + price, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Initialize gasoline price data
 */
async function initializeGasolinePrices() {
  try {
    console.log('Initializing gasoline price data...');
    
    if (!EIA_API_KEY) {
      console.warn('EIA API key not configured, skipping gasoline prices');
      return { prices: [], baseline: null };
    }
    
    const fetcher = new EIAGasolineFetcher(EIA_API_KEY);
    
    // Set date range from Jan 2024 to current
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 7); // Subtract a week to ensure data is available
    
    const startDate = '2024-01-01';
    const endDate = currentDate.toISOString().split('T')[0];
    
    // Fetch gasoline price data
    const prices = await fetcher.fetchGasolinePrices(startDate, endDate);
    console.log(`Fetched ${prices.length} gasoline price records`);
    
    // Save raw response for reference
    await saveRawResponse({ prices });
    
    if (prices.length === 0) {
      console.warn('No gasoline prices found');
      return { prices: [], baseline: null };
    }
    
    // Calculate baseline statistics
    const baseline = calculateBaseline(prices);
    console.log('Gasoline baseline stats:', baseline);
    
    // Add to price data manager
    const commodityId = 'gasoline_regular';
    
    if (!priceDataManager.data[commodityId]) {
      priceDataManager.data[commodityId] = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2024: 'eia-api',
            2025: 'eia-api'
          },
          name: 'Regular Gasoline (Gallon)',
          seriesId: 'PET.EMM_EPMR_PTE_NUS_DPG.W',
          baseline: { 2024: baseline }
        },
        prices: []
      };
    } else {
      // Update metadata if it exists
      priceDataManager.data[commodityId].metadata.lastUpdated = new Date().toISOString();
      priceDataManager.data[commodityId].metadata.dataSource = {
        ...priceDataManager.data[commodityId].metadata.dataSource,
        2024: 'eia-api',
        2025: 'eia-api'
      };
      priceDataManager.data[commodityId].metadata.name = 'Regular Gasoline (Gallon)';
      priceDataManager.data[commodityId].metadata.seriesId = 'PET.EMM_EPMR_PTE_NUS_DPG.W';
      priceDataManager.data[commodityId].metadata.baseline = {
        ...priceDataManager.data[commodityId].metadata.baseline,
        2024: baseline
      };
    }
    
    // Add prices
    priceDataManager.addPriceData(commodityId, prices);
    
    console.log('Successfully initialized gasoline price data');
    return { baseline, prices };
  } catch (error) {
    console.error('Error initializing gasoline prices:', error);
    throw error;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeGasolinePrices()
    .then(() => console.log('Gasoline prices initialization complete!'))
    .catch(error => {
      console.error('Failed to initialize gasoline prices:', error);
      process.exit(1);
    });
}

module.exports = { initializeGasolinePrices };