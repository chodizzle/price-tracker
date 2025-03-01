// check-admin-api.js
// Script to check the admin API endpoint
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Get URL and admin key from environment
const url = process.env.VERCEL_URL;
const adminKey = process.env.ADMIN_SECRET_KEY;

if (!url) {
  console.error('Please set VERCEL_URL in .env.local');
  process.exit(1);
}

if (!adminKey) {
  console.error('Please set ADMIN_SECRET_KEY in .env.local');
  process.exit(1);
}

// Clean the URL and construct the API endpoint
const baseUrl = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
const apiUrl = `https://${baseUrl}/api/admin/init-data`;

console.log(`Checking admin API endpoint: ${apiUrl}`);
console.log(`Using authorization: Bearer ${adminKey.substring(0, 3)}...${adminKey.substring(adminKey.length - 3)}`);

async function checkAdminApi() {
  try {
    console.time('Request completed in');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminKey}`
      }
    });
    console.timeEnd('Request completed in');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
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
    
    if (response.status === 404) {
      console.log('\nThe admin API endpoint returned 404. Possible reasons:');
      console.log('1. The API route file doesn\'t exist at src/app/api/admin/init-data/route.js');
      console.log('2. The Vercel deployment may not include this file');
      console.log('3. There might be a configuration issue in your Next.js app');
    } else if (response.status === 401) {
      console.log('\nThe admin API returned 401 Unauthorized. Check that:');
      console.log('1. The ADMIN_SECRET_KEY in your .env.local matches the one in Vercel');
      console.log('2. The Authorization header is being sent correctly');
    }
    
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

checkAdminApi();