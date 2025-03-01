// manual-init.js
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function manualInitialize() {
  const VERCEL_URL = process.env.VERCEL_URL || 'https://your-deployment-url.vercel.app';
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET) {
    console.error('CRON_SECRET is not set');
    process.exit(1);
  }

  try {
    console.log('Attempting to initialize prices...');
    const response = await fetch(`${VERCEL_URL}/api/cron/update-prices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('Initialization result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Initialization failed');
    }

    console.log('Price data initialized successfully!');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

manualInitialize();