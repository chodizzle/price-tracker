// test-redis.js
// Simple script to test Redis connection
require('dotenv').config({ path: '.env.local' });
const storage = require('./src/lib/storage');

async function testRedis() {
  try {
    console.log('=== TESTING REDIS CONNECTION ===');
    console.log('KV_URL:', process.env.KV_URL ? 'Defined (hidden for security)' : 'Not defined');
    
    // Try a simple set/get operation
    const testKey = 'test_redis_' + Date.now();
    const testValue = { timestamp: new Date().toISOString(), test: 'value' };
    
    console.log(`Setting test key: ${testKey}`);
    await storage.set(testKey, JSON.stringify(testValue));
    console.log('✅ Set operation successful');
    
    console.log(`Getting test key: ${testKey}`);
    const retrievedValue = await storage.get(testKey);
    console.log('Retrieved value:', retrievedValue);
    
    if (retrievedValue) {
      console.log('✅ Get operation successful');
      const parsed = JSON.parse(retrievedValue);
      console.log('Parsed value:', parsed);
    } else {
      console.error('❌ Get operation failed - no value returned');
    }
    
    console.log(`Deleting test key: ${testKey}`);
    await storage.del(testKey);
    console.log('✅ Delete operation successful');
    
    console.log('\n=== REDIS TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n❌ REDIS TEST FAILED');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testRedis();