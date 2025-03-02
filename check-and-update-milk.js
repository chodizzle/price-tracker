// check-and-update-milk.js
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const storage = require('./src/lib/storage');
const { initializeMilkPrices } = require('./src/scripts/init-milk-prices');
const { processPrices } = require('./src/scripts/process-prices');

// Utility to format date for USDA API
function formatDateForUSDA(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

// Check for latest available USDA milk data
async function checkLatestMilkData() {
  try {
    console.log('=== CHECKING LATEST USDA MILK DATA ===');
    
    // USDA API configuration
    const USDA_BASE_URL = 'https://marsapi.ams.usda.gov/services/v1.2';
    const API_KEY = process.env.USDA_API_KEY;
    const MILK_REPORT_ID = '2995'; // National Retail Report - Dairy
    
    if (!API_KEY) {
      throw new Error('USDA_API_KEY not found in environment variables. Check .env.local file.');
    }
    
    // Get current date and format for query
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const startDate = formatDateForUSDA(oneMonthAgo.toISOString().split('T')[0]);
    const endDate = formatDateForUSDA(today.toISOString().split('T')[0]);
    
    console.log(`Checking for milk data from ${startDate} to ${endDate}`);
    
    // Build URL for latest milk prices
    const pricesUrl = `${USDA_BASE_URL}/reports/${MILK_REPORT_ID}/Report Details`;
    const queryParams = `commodity=Milk;package=Gallon;organic=No;region=National;report_begin_date=${startDate}:${endDate}`;
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
    
    // Process and transform the data
    const milkPrices = data.results
      .filter(item => 
        item.region === 'National' && 
        item.package === 'Gallon' && 
        item.organic === 'No' &&
        item.wtd_avg_price !== null
      )
      .map(item => ({
        date: new Date(item.report_end_date || item.report_begin_date).toISOString().split('T')[0],
        price: parseFloat(item.wtd_avg_price),
        minPrice: parseFloat(item.price_min || item.wtd_avg_price),
        maxPrice: parseFloat(item.price_max || item.wtd_avg_price),
        storeCount: parseInt(item.store_count || 0)
      }));
    
    // Sort by date (most recent first)
    const sortedPrices = milkPrices.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedPrices.length === 0) {
      console.log('No milk prices found in USDA API');
      return { needsUpdate: false };
    }
    
    // Get latest price from API
    const latestApiPrice = sortedPrices[0];
    console.log(`Latest USDA milk price: ${latestApiPrice.date} - $${latestApiPrice.price.toFixed(2)}`);
    
    // Get current data from storage
    const rawData = await storage.get('price_data');
    if (!rawData) {
      console.log('No price data found in storage, needs update');
      return { needsUpdate: true, latestApiDate: latestApiPrice.date };
    }
    
    const priceData = JSON.parse(rawData);
    if (!priceData.milk || !priceData.milk.prices || priceData.milk.prices.length === 0) {
      console.log('No milk prices found in storage, needs update');
      return { needsUpdate: true, latestApiDate: latestApiPrice.date };
    }
    
    // Find latest stored milk price
    const storedMilkPrices = priceData.milk.prices
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const latestStoredDate = storedMilkPrices[0].date;
    console.log(`Latest stored milk price: ${latestStoredDate} - $${storedMilkPrices[0].price.toFixed(2)}`);
    
    // Compare dates
    const apiDate = new Date(latestApiPrice.date);
    const storedDate = new Date(latestStoredDate);
    
    if (apiDate > storedDate) {
      console.log(`New milk data available: ${latestApiPrice.date} (stored: ${latestStoredDate})`);
      return { needsUpdate: true, latestApiDate: latestApiPrice.date, latestStoredDate };
    } else {
      console.log('Storage already has the latest milk data');
      return { needsUpdate: false, latestApiDate: latestApiPrice.date, latestStoredDate };
    }
    
  } catch (error) {
    console.error('Error checking latest milk data:', error);
    throw error;
  }
}

// Main function to check and update if needed
async function checkAndUpdateMilk() {
  try {
    // Check if new data is available
    const checkResult = await checkLatestMilkData();
    
    if (checkResult.needsUpdate) {
      console.log('\n=== NEW MILK DATA AVAILABLE, UPDATING ===');
      
      // Update milk prices
      const milkResult = await initializeMilkPrices();
      console.log(`Updated ${milkResult?.prices?.length || 0} milk price records`);
      
      // Process the combined data
      console.log('\n--- PROCESSING COMBINED DATA ---');
      const processedData = await processPrices();
      console.log(`Processed ${processedData.alignedPrices.length} aligned price records`);
      console.log(`Created ${processedData.basket.length} basket price points`);
      
      console.log('\n--- UPDATE COMPLETE ---');
      console.log(`Successfully updated milk prices to ${checkResult.latestApiDate}`);
      
      // Return result
      return {
        updated: true,
        previousDate: checkResult.latestStoredDate,
        newDate: checkResult.latestApiDate,
        pricesUpdated: milkResult?.prices?.length || 0
      };
    } else {
      console.log('\n--- NO UPDATE NEEDED ---');
      console.log('Already have the latest available milk data');
      
      // Return result
      return {
        updated: false,
        currentDate: checkResult.latestApiDate
      };
    }
  } catch (error) {
    console.error('Error in check and update process:', error);
    throw error;
  }
}

// Run the check and update
checkAndUpdateMilk()
  .then(result => {
    console.log('Process completed successfully!');
    console.log('Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed with error:', error);
    process.exit(1);
  });