// test-api.js - A simple script to test the API endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/prices',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('API Response Success:', parsedData.success);
      
      if (parsedData.success) {
        // Log available commodities
        console.log('Available commodities:', Object.keys(parsedData.data.charts || {}));
        
        // Check for gasoline data
        const hasGasoline = parsedData.data.charts && 
                          (parsedData.data.charts.gasoline_regular || 
                           parsedData.data.charts.GASOLINE_REGULAR);
                           
        console.log('Has gasoline data:', !!hasGasoline);
        
        // Log latest basket price
        if (parsedData.data.basket && parsedData.data.basket.length > 0) {
          const latest = parsedData.data.basket[parsedData.data.basket.length - 1];
          console.log('Latest basket price:', latest.basketPrice);
          console.log('Latest date:', latest.formattedDate);
          console.log('Commodities in basket:', Object.keys(latest.prices));
        }
      } else {
        console.error('API Error:', parsedData.error);
      }
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();

// To run this script:
// node test-api.js