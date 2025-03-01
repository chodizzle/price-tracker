// src/lib/eiaGasolineFetcher.js
const fetch = require('node-fetch');

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
  async fetchGasolinePrices(startDate, endDate) {
    try {
      // Set up the API URL with proper parameters
      const url = new URL('https://api.eia.gov/v2/petroleum/pri/gnd/data/');
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('frequency', 'weekly');
      url.searchParams.append('data[0]', 'value');
      url.searchParams.append('facets[series][]', 'EMM_EPMR_PTE_NUS_DPG');
      url.searchParams.append('sort[0][column]', 'period');
      url.searchParams.append('sort[0][direction]', 'asc');
      url.searchParams.append('start', startDate);
      url.searchParams.append('end', endDate);
      url.searchParams.append('offset', '0');
      url.searchParams.append('length', '5000');

      console.log(`Fetching gasoline prices from: ${url.toString()}`);
      
      // Make the request
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        console.error('EIA API error response:', errorText);
        throw new Error(`EIA API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const parsedData = await response.json();
      
      if (!parsedData.response || !parsedData.response.data) {
        console.error('Invalid EIA API response format:', 
                      JSON.stringify(parsedData).substring(0, 500) + '...');
        throw new Error('Invalid EIA API response format');
      }
      
      // Transform the data to our standard format
      const prices = parsedData.response.data.map(item => ({
        date: item.period,
        price: parseFloat(item.value),
        minPrice: parseFloat(item.value) * 0.95, // Estimate min as 5% below average
        maxPrice: parseFloat(item.value) * 1.05, // Estimate max as 5% above average
        source: 'eia',
        series: 'EMM_EPMR_PTE_NUS_DPG'
      }));
      
      // Sort by date
      const sortedPrices = prices.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log(`Successfully fetched ${sortedPrices.length} gasoline price records`);
      return sortedPrices;
    } catch (error) {
      console.error('Error in EIA Gasoline Fetcher:', error);
      throw error;
    }
  }
}

module.exports = EIAGasolineFetcher;