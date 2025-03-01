// test-storage-flow.js
// Test the full data flow using the updated storage approach

const storage = require('./src/lib/storage');
const { processPrices } = require('./src/scripts/process-prices');

// Function to create some test data
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create a minimal prices dataset
  const testData = {
    milk: {
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: {
          2024: 'test-data',
          2025: 'test-data'
        },
        baseline: {
          2024: {
            annualMean: 3.41,
            min: 3.05,
            max: 3.99
          }
        }
      },
      prices: [
        {
          date: '2024 Avg',
          price: 3.41,
          minPrice: 3.41,
          maxPrice: 3.41,
          adj_date: '2024 Avg'
        },
        {
          date: '2025-01-05',
          price: 3.20,
          minPrice: 3.15,
          maxPrice: 3.25,
          storeCount: 6629,
          adj_date: '2025-01-05'
        },
        {
          date: '2025-01-12',
          price: 3.15,
          minPrice: 3.10,
          maxPrice: 3.20,
          storeCount: 6727,
          adj_date: '2025-01-12'
        },
        {
          date: '2025-01-19',
          price: 3.25,
          minPrice: 3.20,
          maxPrice: 3.30,
          storeCount: 5747,
          adj_date: '2025-01-19'
        }
      ]
    },
    eggs: {
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSource: {
          2024: 'test-data',
          2025: 'test-data'
        },
        baseline: {
          2024: {
            annualMean: 3.15,
            min: 1.55,
            max: 6.57
          }
        }
      },
      prices: [
        {
          date: '2024 Avg',
          price: 3.15,
          minPrice: 3.15,
          maxPrice: 3.15,
          adj_date: '2024 Avg'
        },
        {
          date: '2025-01-05',
          price: 5.83,
          minPrice: 5.54,
          maxPrice: 6.12,
          adj_date: '2025-01-05'
        },
        {
          date: '2025-01-12',
          price: 5.99,
          minPrice: 5.69,
          maxPrice: 6.29,
          adj_date: '2025-01-12'
        },
        {
          date: '2025-01-19',
          price: 6.14,
          minPrice: 5.84,
          maxPrice: 6.45,
          adj_date: '2025-01-19'
        }
      ]
    }
  };
  
  // Save test data to storage
  await storage.set('price_data', JSON.stringify(testData));
  console.log('Test data saved to storage');
  
  return testData;
}

// Function to run the processing step
async function runProcessing() {
  console.log('Running data processing...');
  const result = await processPrices();
  console.log('Data processing complete!');
  return result;
}

// Function to verify the storage contains the expected data
async function verifyStorage() {
  console.log('Verifying storage...');
  
  // Check if price_data exists
  const priceDataStr = await storage.get('price_data');
  if (!priceDataStr) {
    console.error('price_data not found in storage');
    return false;
  }
  
  // Check if combined_price_data exists
  const combinedDataStr = await storage.get('combined_price_data');
  if (!combinedDataStr) {
    console.error('combined_price_data not found in storage');
    return false;
  }
  
  // Parse and validate data
  const priceData = JSON.parse(priceDataStr);
  const combinedData = JSON.parse(combinedDataStr);
  
  // Basic validation
  if (!priceData.milk || !priceData.eggs) {
    console.error('Price data missing expected commodities');
    return false;
  }
  
  if (!combinedData.basket || !combinedData.charts) {
    console.error('Combined data missing expected sections');
    return false;
  }
  
  console.log('Storage verification passed!');
  console.log('Combined data summary:');
  console.log('- Commodities:', Object.keys(combinedData.charts));
  console.log('- Basket points:', combinedData.basket.length);
  console.log('- Latest basket price:', combinedData.metadata.latest?.basketPrice);
  
  return true;
}

// Main test function
async function runTest() {
  try {
    console.log('=== STARTING STORAGE FLOW TEST ===');
    
    // First, set up test data
    await setupTestData();
    
    // Run the processing
    const processedData = await runProcessing();
    
    // Verify everything is in storage correctly
    const verified = await verifyStorage();
    
    if (verified) {
      console.log('✅ TEST PASSED: Storage flow is working correctly');
    } else {
      console.error('❌ TEST FAILED: Storage flow verification failed');
    }
    
    // Cleanup (optional)
    // await storage.del('test_price_data');
    // await storage.del('test_combined_data');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Ensure the script exits
    process.exit(0);
  }
}

// Run the test
runTest();