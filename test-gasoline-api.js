const path = require('path');
const https = require('https');

// test-gasoline-api.js - Test the EIA gasoline API integration
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

// Get API key from environment
const API_KEY = process.env.EIA_API_KEY;

if (!API_KEY) {
  console.error('EIA_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('Testing EIA Gasoline Price API...');

// Using the exact URL format that works based on user findings
const url = new URL('https://api.eia.gov/v2/petroleum/pri/gnd/data/');
url.searchParams.append('api_key', API_KEY);
url.searchParams.append('frequency', 'weekly');
url.searchParams.append('data[0]', 'value');
url.searchParams.append('facets[series][]', 'EMM_EPMR_PTE_NUS_DPG');
url.searchParams.append('sort[0][column]', 'period');
url.searchParams.append('sort[0][direction]', 'desc');
url.searchParams.append('offset', '0');
url.searchParams.append('length', '5000');

console.log(`Making request to: ${url.toString()}`);

// Set up headers
const options = {
  headers: {
    'Accept': 'application/json'
  }
};

// Make the API call directly
https.get(url, options, (res) => {
  const { statusCode } = res;
  console.log(`Status code: ${statusCode}`);
  
  // Handle HTTP errors
  if (statusCode !== 200) {
    console.error(`EIA API request failed with status: ${statusCode}`);
    
    // Capture and log error response
    let errorData = '';
    res.on('data', (chunk) => { errorData += chunk; });
    res.on('end', () => {
      console.error('Error response:', errorData);
      process.exit(1);
    });
    return;
  }
  
  // Collect data
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  
  // Process complete response
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      
      console.log("API Response structure:", Object.keys(parsedData));
      
      if (!parsedData.response) {
        console.error('Invalid EIA API response format:', parsedData);
        process.exit(1);
        return;
      }
      
      console.log(`Found ${parsedData.response.total || 0} data points`);
      
      if (!parsedData.response.data || !parsedData.response.data.length) {
        console.log('No data points returned in the response');
        process.exit(0);
        return;
      }
      
      // Log sample data
      console.log("First data point fields:", Object.keys(parsedData.response.data[0]));
      console.log("Sample data point:", JSON.stringify(parsedData.response.data[0], null, 2));
      
      // Convert to our standard price format
      const prices = parsedData.response.data.map(item => ({
        date: item.period,
        price: parseFloat(item.value),
        minPrice: parseFloat(item.value) * 0.95, // Estimate min as 5% below average
        maxPrice: parseFloat(item.value) * 1.05, // Estimate max as 5% above average
        source: 'eia',
        series: 'EMM_EPMR_PTE_NUS_DPG'
      }));
      
      console.log(`Successfully processed ${prices.length} price records`);
      
      // Display sample data
      if (prices.length > 0) {
        console.log('\nSample price data:');
        console.table(prices.slice(0, 5));
        
        console.log('\nDate range:');
        const sortedPrices = [...prices].sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log(`First date: ${sortedPrices[0].date}`);
        console.log(`Last date: ${sortedPrices[sortedPrices.length - 1].date}`);
        
        // Calculate average
        const avg = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
        console.log(`\nAverage price: ${avg.toFixed(2)}`);
      }
    } catch (e) {
      console.error('Error parsing EIA API response:', e.message);
      console.error('First 200 characters of response:', rawData.substring(0, 200));
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error(`EIA API request error: ${e.message}`);
  process.exit(1);
});