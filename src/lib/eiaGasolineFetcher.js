// src/lib/eiaGasolineFetcher.js
const https = require('https');

/**
 * Simple focused module to fetch regular gasoline prices from the EIA API
 */
class EIAGasolineFetcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch regular gasoline prices
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of price data points
   */
  fetchGasolinePrices(startDate, endDate) {
    return new Promise((resolve, reject) => {
      // Series ID for regular gasoline
      const seriesId = 'PET.EMM_EPMR_PTE_NUS_DPG.W'; // Weekly U.S. Regular Gasoline Prices (Dollars per Gallon)
      
      // Build URL with the correct format - conform to EIA API v2 specifications
      const url = new URL(`https://api.eia.gov/v2/seriesid/${seriesId}/data/`);
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('frequency', 'weekly');
      url.searchParams.append('data[0]', 'value'); // Specifically request the 'value' field
      url.searchParams.append('start', startDate);
      url.searchParams.append('end', endDate);
      url.searchParams.append('sort[0][column]', 'period');
      url.searchParams.append('sort[0][direction]', 'asc');

      console.log(`Fetching gasoline prices from: ${url.toString()}`);
      
      // Make request
      https.get(url, (res) => {
        const { statusCode } = res;
        let error;
        
        // Handle HTTP errors
        if (statusCode !== 200) {
          error = new Error(`EIA API request failed with status: ${statusCode}`);
        }
        
        // Handle error
        if (error) {
          console.error(`EIA API Error: ${error.message}`);
          // Consume response data to free up memory
          res.resume();
          reject(error);
          return;
        }
        
        // Collect data
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        
        // Process complete response
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            
            if (!parsedData.response || !parsedData.response.data) {
              console.error('Invalid EIA API response format:', JSON.stringify(parsedData).substring(0, 500) + '...');
              throw new Error('Invalid EIA API response format');
            }
            
            // Transform the data to our standard format
            const prices = parsedData.response.data.map(item => ({
              date: item.period,
              price: parseFloat(item.value),
              minPrice: parseFloat(item.value) * 0.95, // Estimate min as 5% below average
              maxPrice: parseFloat(item.value) * 1.05, // Estimate max as 5% above average
              source: 'eia',
              seriesId
            }));
            
            // Sort by date
            const sortedPrices = prices.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            console.log(`Successfully fetched ${sortedPrices.length} gasoline price records`);
            resolve(sortedPrices);
            
          } catch (e) {
            console.error('Error parsing EIA API response:', e.message);
            // Log part of the raw response to diagnose the issue
            if (rawData) {
              console.error('First 300 characters of response:', rawData.substring(0, 300));
            }
            reject(new Error(`Error parsing EIA API response: ${e.message}`));
          }
        });
      }).on('error', (e) => {
        console.error(`EIA API request error: ${e.message}`);
        reject(new Error(`EIA API request error: ${e.message}`));
      });
    });
  }
}

module.exports = EIAGasolineFetcher;