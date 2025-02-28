// test-updated-fetcher.js
const path = require('path');
const EIAGasolineFetcher = require('./src/lib/eiaGasolineFetcher');

// Load environment variables
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// Get API key from environment
const API_KEY = process.env.EIA_API_KEY;

if (!API_KEY) {
  console.error('EIA_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('Testing updated EIA Gasoline Fetcher...');

// Create an instance of the fetcher
const fetcher = new EIAGasolineFetcher(API_KEY);

// Set date range
const startDate = '2024-01-01';
const endDate = '2025-02-25';  // Set to current date

// Fetch the data
fetcher.fetchGasolinePrices(startDate, endDate)
  .then(prices => {
    console.log(`Successfully fetched ${prices.length} prices`);
    
    // Display sample data
    if (prices.length > 0) {
      console.log('\nSample price data:');
      console.log(prices.slice(0, 3));
      
      // Show min/max dates
      const dates = prices.map(p => new Date(p.date));
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      
      console.log('\nDate range:');
      console.log(`First date: ${minDate.toISOString().split('T')[0]}`);
      console.log(`Last date: ${maxDate.toISOString().split('T')[0]}`);
      
      // Calculate average
      const avg = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
      console.log(`\nAverage price: $${avg.toFixed(2)}`);
    }
  })
  .catch(error => {
    console.error('Error testing fetcher:', error);
    process.exit(1);
  });