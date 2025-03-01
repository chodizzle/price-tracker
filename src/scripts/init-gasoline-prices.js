// src/scripts/init-gasoline-prices.js
const path = require('path');
const { getPriceDataManager } = require('../lib/priceDataManager');
const EIAGasolineFetcher = require('../lib/eiaGasolineFetcher');
const storage = require('../lib/storage');

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
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `gasoline_prices_raw_${timestamp}`;
    
    // Save to storage
    await storage.set(key, JSON.stringify(data));
    
    // Also update the latest version
    await storage.set('gasoline_prices_raw', JSON.stringify(data));
    
    console.log(`Saved raw gasoline data with key: ${key}`);
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
    
    // Get price data manager
    const priceDataManager = await getPriceDataManager();
    
    // Add to price data manager
    const commodityId = 'gasoline_regular';
    
    // Get current data
    const currentData = await storage.get('price_data');
    let data = currentData ? JSON.parse(currentData) : {};
    
    if (!data[commodityId]) {
      data[commodityId] = {
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
      data[commodityId].metadata.lastUpdated = new Date().toISOString();
      data[commodityId].metadata.dataSource = {
        ...data[commodityId].metadata.dataSource,
        2024: 'eia-api',
        2025: 'eia-api'
      };
      data[commodityId].metadata.name = 'Regular Gasoline (Gallon)';
      data[commodityId].metadata.seriesId = 'PET.EMM_EPMR_PTE_NUS_DPG.W';
      data[commodityId].metadata.baseline = {
        ...data[commodityId].metadata.baseline,
        2024: baseline
      };
    }
    
    // Add prices
    const existingDates = new Set(data[commodityId].prices.map(p => p.date));
    const newPrices = prices.filter(p => !existingDates.has(p.date));
    
    if (newPrices.length > 0) {
      // Add the new prices
      data[commodityId].prices = [
        ...data[commodityId].prices,
        ...newPrices
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Save the updated data
      await storage.set('price_data', JSON.stringify(data));
      console.log(`Added ${newPrices.length} new gasoline prices`);
    } else {
      console.log('No new gasoline prices to add');
    }
    
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