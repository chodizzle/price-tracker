// test-storage.js
const storage = require('./src/lib/storage');

async function testStorage() {
  try {
    // Test setting a value
    await storage.set('test-key', { message: 'It works!', timestamp: Date.now() });
    console.log('Successfully set test value');
    
    // Test getting a value
    const value = await storage.get('test-key');
    console.log('Retrieved value:', value);
    
    // Clean up
    await storage.del('test-key');
    console.log('Storage wrapper is working properly!');
  } catch (error) {
    console.error('Storage error:', error);
  }
  
  // Exit process when done
  process.exit(0);
}

testStorage();