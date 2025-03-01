// init-prices.js - Root level initialization script
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// Import initialization functions - correct paths based on directory structure
const { initializeEggPrices } = require('./init-egg-prices');
const { initializeMilkPrices } = require('./init-milk-prices');
const { initializeGasolinePrices } = require('./init-gasoline-prices');
const { getPriceDataManager } = require('../lib/priceDataManager');
const { processPrices } = require('./process-prices');

/**
 * Main initialization function
 */
async function initializeAll() {
  console.log('=== PRICE DATA INITIALIZATION ===');
  console.log('Current time:', new Date().toISOString());
  
  try {
    // Get the price data manager with async awaiting
    const priceDataManager = await getPriceDataManager();
    
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
    
    // Then initialize gasoline prices
    console.log('\n--- INITIALIZING GASOLINE PRICES ---');
    const gasolineResult = await initializeGasolinePrices();
    console.log(`Initialized ${gasolineResult?.prices?.length || 0} gasoline price records`);
    console.log('Gasoline prices baseline:', gasolineResult?.baseline);
    
    // // Then initialize other EIA energy prices
    // console.log('\n--- INITIALIZING OTHER EIA ENERGY PRICES ---');
    // const eiaResult = await initializeEIAPrices();
    // console.log('EIA prices initialized for commodities:', Object.keys(eiaResult || {}).join(', '));
    
    // Process the combined data
    console.log('\n--- PROCESSING COMBINED DATA ---');
    const processedData = await processPrices();
    console.log(`Processed ${processedData.alignedPrices.length} aligned price records`);
    console.log(`Created ${processedData.basket.length} basket price points`);
    
    // Show final data statistics
    console.log('\n--- INITIALIZATION COMPLETE ---');
    
    // Load the final data for stats
    const finalData = await storage.get('price_data');
    const parsedData = JSON.parse(finalData);
    
    console.log('Final data structure:', {
      eggs: {
        count: parsedData.eggs?.prices?.length || 0,
        dateRange: {
          first: parsedData.eggs?.prices[0]?.date,
          last: parsedData.eggs?.prices[parsedData.eggs?.prices?.length - 1]?.date
        }
      },
      milk: {
        count: parsedData.milk?.prices?.length || 0,
        dateRange: {
          first: parsedData.milk?.prices[0]?.date,
          last: parsedData.milk?.prices[parsedData.milk?.prices?.length - 1]?.date
        }
      },
      gasoline_regular: {
        count: parsedData.gasoline_regular?.prices?.length || 0,
        dateRange: {
          first: parsedData.gasoline_regular?.prices[0]?.date,
          last: parsedData.gasoline_regular?.prices[parsedData.gasoline_regular?.prices?.length - 1]?.date
        }
      },
      energy: {
        commodities: Object.keys(parsedData).filter(key => 
          !['eggs', 'milk', 'gasoline_regular'].includes(key) && parsedData[key]?.prices?.length > 0
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

// Import the storage module
const storage = require('../lib/storage');

// Check if we should update just one commodity
const updateArg = process.argv[2];

// Function to handle the async operations
async function runUpdate() {
  try {
    if (updateArg === 'update-milk') {
      console.log('Updating only milk prices...');
      await initializeMilkPrices();
      await processPrices();
      console.log('Milk prices update complete!');
    } else if (updateArg === 'update-eggs') {
      console.log('Updating only egg prices...');
      await initializeEggPrices();
      await processPrices();
      console.log('Egg prices update complete!');
    } else if (updateArg === 'update-gasoline') {
      console.log('Updating only gasoline prices...');
      await initializeGasolinePrices();
      await processPrices();
      console.log('Gasoline prices update complete!');
    // } else if (updateArg === 'update-eia') {
    //   console.log('Updating only EIA energy prices...');
    //   await initializeEIAPrices();
    //   await processPrices();
    //   console.log('EIA energy prices update complete!');
    } else {
      // Run the full initialization if no specific update is requested
      await initializeAll();
      console.log('Full initialization complete!');
    }
    
    // Exit the process when done
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the async update function
runUpdate();

module.exports = { initializeAll };