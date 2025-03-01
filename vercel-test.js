// vercel-test.js
// Script to test your Vercel deployment
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Get environment variables
const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

if (!VERCEL_URL) {
  console.error('VERCEL_URL not set. Please provide your Vercel deployment URL.');
  process.exit(1);
}

if (!ADMIN_SECRET_KEY) {
  console.error('ADMIN_SECRET_KEY not set. Please set this in your environment variables.');
  process.exit(1);
}

// Remove trailing slashes from the URL
const baseUrl = VERCEL_URL.replace(/\/+$/, '');
// Define the API URL properly
const apiUrl = `https://${baseUrl}/api/prices`;

async function runTest() {
  try {
    console.log('\n1. Testing API endpoint...');
    console.log(`API URL: ${apiUrl}`);
    
    const apiResponse = await fetch(apiUrl);
    console.log(`API response status: ${apiResponse.status}`);
    
    // Continue even if it's a 404 with "Combined price data not available"
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.log('Error response:', errorText);
      
      if (apiResponse.status === 404 && errorText.includes('Combined price data not available')) {
        console.log('API responded with "Combined price data not available" - this is expected before initialization');
      } else {
        throw new Error(`API request failed with status ${apiResponse.status}`);
      }
    } else {
      const apiData = await apiResponse.json();
      console.log('API response:', apiData.success ? 'SUCCESS' : 'FAILED');
      
      if (!apiData.success) {
        console.error('API returned error:', apiData.error);
      }
    }
    
    // 2. Test data initialization (if needed)
    const shouldInitData = process.argv.includes('--init');
    if (shouldInitData) {
      console.log('\n2. Testing data initialization...');
      const initUrl = `https://${baseUrl}/api/admin/init-data`;
      console.log(`Init URL: ${initUrl}`);
      
      const initResponse = await fetch(initUrl, {
        headers: {
          'Authorization': `Bearer ${ADMIN_SECRET_KEY}`
        }
      });
      
      console.log(`Init response status: ${initResponse.status}`);
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Error response:', errorText);
        throw new Error(`Init request failed with status ${initResponse.status}`);
      }
      
      const initData = await initResponse.json();
      console.log('Init response:', initData);
      
      if (initData.success) {
        console.log('✅ Data initialization SUCCESS');
        console.log('Stats:', initData.stats);
      } else {
        console.error('❌ Data initialization FAILED');
        console.error('Error:', initData.error);
      }
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(error);
    process.exit(1);
  }
}

runTest();