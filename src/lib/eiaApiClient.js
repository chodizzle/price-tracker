// src/lib/eiaApiClient.js
const fetch = require('node-fetch');

/**
 * Client for interacting with the EIA API to fetch energy commodity prices
 */
class EIAApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.eia.gov/v2';
  }

  /**
   * Fetch historical data for a specific commodity
   * @param {string} seriesId - The EIA series ID for the commodity
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} - Array of price data points
   */
  async fetchCommodityData(seriesId, startDate, endDate) {
    try {
      const url = new URL(`${this.baseUrl}/seriesid/${seriesId}/data/`);
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('frequency', 'weekly');
      url.searchParams.append('data[0]', 'value');
      url.searchParams.append('start', startDate);
      url.searchParams.append('end', endDate);
      url.searchParams.append('sort[0][column]', 'period');
      url.searchParams.append('sort[0][direction]', 'asc');

      console.log(`Fetching EIA data from: ${url.toString()}`);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`EIA API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return this.processEIAResponse(data, seriesId);
    } catch (error) {
      console.error(`Error fetching EIA data for ${seriesId}:`, error);
      throw error;
    }
  }

  /**
   * Process the EIA API response into a standardized format
   * @param {Object} responseData - The raw EIA API response
   * @param {string} seriesId - The EIA series ID for the commodity
   * @returns {Array} - Processed price data
   */
  processEIAResponse(responseData, seriesId) {
    try {
      if (!responseData.response || !responseData.response.data) {
        throw new Error('Invalid EIA API response format');
      }

      const prices = responseData.response.data.map(item => ({
        date: item.period,
        price: parseFloat(item.value),
        minPrice: parseFloat(item.value) * 0.95, // Estimate min price as 5% below average
        maxPrice: parseFloat(item.value) * 1.05, // Estimate max price as 5% above average
        source: 'eia',
        seriesId
      }));

      return prices.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error processing EIA data:', error);
      throw error;
    }
  }

  /**
   * Gets metadata for a commodity series
   * @param {string} seriesId - The EIA series ID
   * @returns {Promise<Object>} - Series metadata
   */
  async getSeriesInfo(seriesId) {
    try {
      const url = new URL(`${this.baseUrl}/seriesid/${seriesId}/info/`);
      url.searchParams.append('api_key', this.apiKey);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`EIA API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.response.series_info;
    } catch (error) {
      console.error(`Error fetching EIA series info for ${seriesId}:`, error);
      throw error;
    }
  }
}

module.exports = EIAApiClient;