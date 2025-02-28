const path = require('path');

// test-gasoline-api.js - Test the EIA gasoline API integration
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
const EIAGasolineFetcher = require('./src/lib/eiaGasolineFetcher');

// Get API key from environment
const API_KEY = process.env.EIA_API_KEY;

if (!API_KEY) {
  console.error('EIA_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('Testing EIA Gasoline Price API...');

// Create fetcher
const fetcher = new EIAGasolineFetcher(API_KEY);

// Set date range (last 3 months)
const endDate = new Date();
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 3);

const startStr = startDate.toISOString().split('T')[0];
const endStr = endDate.toISOString().split('T')[0];

console.log(`Fetching gasoline prices from ${startStr} to ${endStr}...`);

// Make the API call
fetcher.fetchGasolinePrices(startStr, endStr)
  .then(prices => {
    console.log(`Successfully fetched ${prices.length} price records`);
    
    // Display sample data
    if (prices.length > 0) {
      console.log('\nSample price data:');
      console.table(prices.slice(0, 5));
      
      console.log('\nDate range:');
      console.log(`First date: ${prices[0].date}`);
      console.log(`Last date: ${prices[prices.length - 1].date}`);
      
      // Calculate average
      const avg = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
      console.log(`\nAverage price: $${avg.toFixed(2)}`);
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });