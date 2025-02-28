// init-prices.js - Root level initialization script
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// Import initialization functions - correct paths based on directory structure
const { initializeEggPrices } = require('./src/scripts/init-egg-prices');
const { initializeMilkPrices } = require('./src/scripts/init-milk-prices');
const { initializeEIAPrices } = require('./src/scripts/init-eia-prices');
const { priceDataManager } = require('./src/lib/priceDataManager');
const { processPrices } = require('./src/scripts/process-prices');

/**
 * Main initialization function
 */
async function initializeAll() {
  console.log('=== PRICE DATA INITIALIZATION ===');
  console.log('Current time:', new Date().toISOString());
  
  try {
    // Initialize egg prices first
    console.log('\n--- INITIALIZING EGG PRICES ---');
    const eggResult = await initializeEggPrices();
    console.log(`Initialized ${eggResult?.prices?.length || 0} egg price records`);
    console.log('Egg prices baseline:', eggResult?.baseline);
    
    // Then initialize milk prices
    console.log('\n--- INITIALIZING MILK PRICES ---');
    const milkResult = await initializeMilkPrices();
    console.log(`Initialized ${milkResult?.prices?.length || 0} milk price records`);
    console.log('Milk prices baseline:', milkResult?.baseline);
    
    // Then initialize EIA energy prices
    console.log('\n--- INITIALIZING EIA ENERGY PRICES ---');
    const eiaResult = await initializeEIAPrices();
    console.log('EIA prices initialized for commodities:', Object.keys(eiaResult || {}).join(', '));
    
    // Process the combined data
    console.log('\n--- PROCESSING COMBINED DATA ---');
    const processedData = await processPrices();
    console.log(`Processed ${processedData.alignedPrices.length} aligned price records`);
    console.log(`Created ${processedData.basket.length} basket price points`);
    
    // Show final data statistics
    console.log('\n--- INITIALIZATION COMPLETE ---');
    console.log('Final data structure:', {
      eggs: {
        count: priceDataManager.data.eggs?.prices?.length || 0,
        dateRange: {
          first: priceDataManager.data.eggs?.prices[0]?.date,
          last: priceDataManager.data.eggs?.prices[priceDataManager.data.eggs?.prices?.length - 1]?.date
        }
      },
      milk: {
        count: priceDataManager.data.milk?.prices?.length || 0,
        dateRange: {
          first: priceDataManager.data.milk?.prices[0]?.date,
          last: priceDataManager.data.milk?.prices[priceDataManager.data.milk?.prices?.length - 1]?.date
        }
      },
      energy: {
        commodities: Object.keys(priceDataManager.data).filter(key => 
          !['eggs', 'milk'].includes(key) && priceDataManager.data[key]?.prices?.length > 0
        )
      },
      processed: {
        alignedPrices: processedData.alignedPrices.length,
        basketPoints: processedData.basket.length
      }
    });
    
    console.log('Data successfully initialized!');
    return processedData;
  } catch (error) {
    console.error('Initialization failed:', error);
    throw error;
  }
}

// Check if we should update just one commodity
const updateArg = process.argv[2];
if (updateArg === 'update-milk') {
  console.log('Updating only milk prices...');
  initializeMilkPrices()
    .then(() => processPrices())
    .then(() => console.log('Milk prices update complete!'))
    .catch(error => {
      console.error('Failed to update milk prices:', error);
      process.exit(1);
    });
} else if (updateArg === 'update-eggs') {
  console.log('Updating only egg prices...');
  initializeEggPrices()
    .then(() => processPrices())
    .then(() => console.log('Egg prices update complete!'))
    .catch(error => {
      console.error('Failed to update egg prices:', error);
      process.exit(1);
    });
} else if (updateArg === 'update-eia') {
  console.log('Updating only EIA energy prices...');
  initializeEIAPrices()
    .then(() => processPrices())
    .then(() => console.log('EIA energy prices update complete!'))
    .catch(error => {
      console.error('Failed to update EIA energy prices:', error);
      process.exit(1);
    });
} else {
  // Run the full initialization if no specific update is requested
  initializeAll().catch(error => {
    console.error('Full initialization failed:', error);
    process.exit(1);
  });
}

module.exports = { initializeAll };