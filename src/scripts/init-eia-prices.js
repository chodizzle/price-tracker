// src/scripts/init-eia-prices.js
const path = require('path');
const { getPriceDataManager } = require('../lib/priceDataManager');
const EIAApiClient = require('../lib/eiaApiClient');
const { EIA_SERIES, EIA_COMMODITY_NAMES, EIA_API_MAPPING } = require('../lib/eiaConstants');
const storage = require('../lib/storage');

// Load environment variables
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// EIA API configuration
const EIA_API_KEY = process.env.EIA_API_KEY;
if (!EIA_API_KEY) {
  console.warn('EIA_API_KEY not found in environment variables. Check .env.local file.');
}

/**
 * Calculate baseline statistics for a commodity's prices
 * @param {Array} prices - Array of price objects
 * @returns {Object} - Stats object
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
  const pricesForYear = prices.filter(p => p.date.startsWith('2024'));
  
  if (pricesForYear.length === 0) {
    console.warn('No 2024 prices found for baseline calculation');
    return {
      annualMean: 0,
      min: 0,
      max: 0
    };
  }
  
  const values = pricesForYear.map(p => p.price);
  return {
    annualMean: values.reduce((sum, price) => sum + price, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Save raw EIA API response for debugging
 * @param {Object} data - Raw API response
 * @param {string} commodityKey - The commodity key (e.g., WTI_CRUDE)
 */
async function saveRawResponse(data, commodityKey) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const key = `eia_${commodityKey.toLowerCase()}_${timestamp}`;
    
    // Save to storage
    await storage.set(key, JSON.stringify(data));
    
    // Also update the latest version
    await storage.set(`eia_${commodityKey.toLowerCase()}_raw`, JSON.stringify(data));
    
    console.log(`Saved raw EIA data with key: ${key}`);
  } catch (error) {
    console.error('Error saving raw EIA data:', error);
  }
}

/**
 * Initialize data for a specific energy commodity
 * @param {string} commodityKey - The commodity key (e.g., WTI_CRUDE)
 * @param {string} seriesId - The EIA series ID
 * @returns {Promise<Object>} - The processed data
 */
async function initializeCommodityData(commodityKey, seriesId) {
  try {
    console.log(`Initializing EIA data for ${commodityKey} (${seriesId})...`);
    
    if (!EIA_API_KEY) {
      console.warn(`EIA API key not configured, skipping ${commodityKey}`);
      return { prices: [], baseline: null };
    }
    
    const eiaClient = new EIAApiClient(EIA_API_KEY);
    
    // Set date range from Jan 2024 to current
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 7); // Subtract a week to ensure data is available
    
    const startDate = '2024-01-01';
    const endDate = currentDate.toISOString().split('T')[0];
    
    console.log(`Fetching ${commodityKey} prices from ${startDate} to ${endDate}...`);
    
    // Fetch price data
    const prices = await eiaClient.fetchCommodityData(seriesId, startDate, endDate);
    console.log(`Fetched ${prices.length} price records for ${commodityKey}`);
    
    // Save raw response for reference
    await saveRawResponse({ prices }, commodityKey);
    
    if (prices.length === 0) {
      console.warn(`No prices found for ${commodityKey}`);
      return { prices: [], baseline: null };
    }
    
    // Filter to ensure only 2024 onwards prices
    const prices2024onwards = prices.filter(p => {
      const year = parseInt(p.date.split('-')[0]);
      return year >= 2024;
    });
    
    console.log(`Filtered to ${prices2024onwards.length} prices from 2024 onwards`);
    
    // Calculate baseline statistics
    const baseline = calculateBaseline(prices2024onwards);
    console.log(`${commodityKey} baseline stats:`, baseline);
    
    // Get data from storage for updating
    const currentData = await storage.get('price_data');
    let data = currentData ? JSON.parse(currentData) : {};
    
    // Add to price data storage
    const commodityId = commodityKey.toLowerCase();
    
    // Get the API series mapping if available
    const apiMapping = EIA_API_MAPPING[seriesId] || {};
    
    if (!data[commodityId]) {
      data[commodityId] = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2024: 'eia-api',
            2025: 'eia-api'
          },
          name: EIA_COMMODITY_NAMES[commodityKey],
          seriesId,
          series: apiMapping.facetSeries || seriesId.split('.')[1],
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
      data[commodityId].metadata.name = EIA_COMMODITY_NAMES[commodityKey];
      data[commodityId].metadata.seriesId = seriesId;
      data[commodityId].metadata.series = apiMapping.facetSeries || seriesId.split('.')[1];
      data[commodityId].metadata.baseline = {
        ...data[commodityId].metadata.baseline,
        2024: baseline
      };
    }
    
    // Add the new prices
    const existingDates = new Set(data[commodityId].prices?.map(p => p.date) || []);
    const newPrices = prices2024onwards.filter(p => !existingDates.has(p.date));
    
    if (newPrices.length > 0) {
      data[commodityId].prices = [
        ...(data[commodityId].prices || []),
        ...newPrices
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Save the updated data
      await storage.set('price_data', JSON.stringify(data));
      console.log(`Added ${newPrices.length} new ${commodityId} prices`);
    } else {
      console.log(`No new prices to add for ${commodityId}`);
    }
    
    console.log(`Successfully initialized ${commodityKey} price data`);
    return { baseline, prices: prices2024onwards };
  } catch (error) {
    console.error(`Error initializing ${commodityKey} prices:`, error);
    throw error;
  }
}

/**
 * Initialize all EIA data
 */
async function initializeEIAPrices() {
  console.log('=== INITIALIZING EIA PRICE DATA ===');
  console.log('Current time:', new Date().toISOString());
  
  try {
    // Select a subset of commodities to initialize
    const commoditiesToInit = [
      { key: 'WTI_CRUDE', seriesId: EIA_SERIES.WTI_CRUDE },
      { key: 'GASOLINE_REGULAR', seriesId: EIA_SERIES.GASOLINE_REGULAR },
      { key: 'NATURAL_GAS', seriesId: EIA_SERIES.NATURAL_GAS }
    ];
    
    const results = {};
    
    // Initialize each commodity
    for (const commodity of commoditiesToInit) {
      console.log(`\n--- INITIALIZING ${commodity.key} ---`);
      try {
        results[commodity.key] = await initializeCommodityData(commodity.key, commodity.seriesId);
      } catch (error) {
        console.error(`Failed to initialize ${commodity.key}:`, error);
        results[commodity.key] = { error: error.message };
      }
    }
    
    console.log('\n--- EIA DATA INITIALIZATION COMPLETE ---');
    
    return results;
  } catch (error) {
    console.error('Error initializing EIA prices:', error);
    throw error;
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeEIAPrices()
    .then(() => console.log('EIA prices initialization complete!'))
    .catch(error => {
      console.error('Failed to initialize EIA prices:', error);
      process.exit(1);
    });
}

module.exports = { initializeEIAPrices, initializeCommodityData };