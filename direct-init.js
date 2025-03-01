// direct-init.js
// Script to directly run the initialization without going through the API

require('dotenv').config({ path: '.env.local' });

async function directInit() {
  try {
    console.log('=== DIRECT INITIALIZATION ===');
    
    // Import dynamically to avoid bundling issues
    const { initializeAll } = await import('./src/scripts/init-prices.js');
    const { processPrices } = await import('./src/scripts/process-prices.js');
    
    // Initialize all price data
    console.log('Starting price data initialization...');
    await initializeAll();
    
    // Process the data
    console.log('Processing price data...');
    const result = await processPrices();
    
    console.log('Initialization complete!');
    console.log('Stats:', {
      commodities: Object.keys(result.charts || {}),
      basketPoints: result.basket?.length || 0,
      alignedPrices: result.alignedPrices?.length || 0
    });
    
    return { success: true };
  } catch (error) {
    console.error('Direct initialization failed:', error);
    process.exit(1);
  }
}

directInit()
  .then(() => {
    console.log('Direct initialization completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Direct initialization failed with error:', error);
    process.exit(1);
  });