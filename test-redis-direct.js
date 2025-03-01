const { createClient } = require('redis');

async function testRedis() {
  // Create Redis client
  const client = createClient({
    url: 'redis://localhost:6379'
  });

  // Error handling
  client.on('error', (err) => console.log('Redis Client Error', err));

  try {
    // Connect to Redis
    await client.connect();
    console.log('Connected to Redis');

    // Test setting a value
    await client.set('test-key', 'It works!');
    console.log('Successfully set test value');
    
    // Test getting a value
    const value = await client.get('test-key');
    console.log('Retrieved value:', value);
    
    // Clean up
    await client.del('test-key');
    console.log('Redis connection is working properly!');

    // Close the connection
    await client.disconnect();
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}

testRedis();