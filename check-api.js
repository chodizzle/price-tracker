// check-api.js
// Simple script to check if the API endpoint exists
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Get URL from arguments or environment
const url = process.argv[2] || process.env.VERCEL_URL;

if (!url) {
  console.error('Please provide a URL as an argument or set VERCEL_URL in .env.local');
  process.exit(1);
}

// Clean the URL and construct the API endpoint
const baseUrl = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
const apiUrl = `https://${baseUrl}/api/prices`;

console.log(`Checking API endpoint: ${apiUrl}`);

async function checkApi() {
  try {
    console.time('Request completed in');
    const response = await fetch(apiUrl);
    console.timeEnd('Request completed in');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers: ${JSON.stringify(response.headers.raw(), null, 2)}`);
    
    // Try to get response body
    try {
      const text = await response.text();
      console.log(`Response Body (${text.length} bytes):`);
      console.log(text.length > 1000 ? text.substring(0, 1000) + '...' : text);
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          const json = JSON.parse(text);
          console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('Failed to parse JSON:', e.message);
        }
      }
    } catch (e) {
      console.log('Failed to read response body:', e.message);
    }
    
    // Check if it's a 404
    if (response.status === 404) {
      console.log('\nThe API endpoint returned 404. Possible reasons:');
      console.log('1. The API route file doesn\'t exist or has a different path');
      console.log('2. The Vercel deployment may not be complete');
      console.log('3. There might be a configuration issue in your Next.js app');
      
      console.log('\nSuggestions:');
      console.log('- Check that src/app/api/prices/route.js exists');
      console.log('- Verify the file has been committed and pushed to your repository');
      console.log('- Check the Vercel deployment logs for any build errors');
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

checkApi();
