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

async function runTest() {
  try {
    console.log('=== TESTING VERCEL DEPLOYMENT ===');
    console.log(`URL: ${VERCEL_URL}`);
    
    // 1. Test the API endpoint
    console.log('\n1. Testing prices API endpoint...');
    const apiUrl = `https://${VERCEL_URL}/api/prices`;
    console.log(`API URL: ${apiUrl}`);
    
    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    console.log('API response:', apiData.success ? 'SUCCESS' : 'FAILED');
    
    // 2. Test data initialization (if needed)
    const shouldInitData = process.argv.includes('--init');
    if (shouldInitData) {
      console.log('\n2. Testing data initialization...');
      const initUrl = `https://${VERCEL_URL}/api/admin/init-data`;
      console.log(`Init URL: ${initUrl}`);
      
      const initResponse = await fetch(initUrl, {
        headers: {
          'Authorization': `Bearer ${ADMIN_SECRET_KEY}`
        }
      });
      
      if (!initResponse.ok) {
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
  }
}

runTest();