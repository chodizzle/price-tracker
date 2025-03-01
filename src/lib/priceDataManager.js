// src/lib/priceDataManager.js
const storage = require('./storage');
const { getNearestFriday, isFriday } = require('../lib/utils');

/**
 * Adds adjusted date field to price data
 * @param {Array} prices - Array of price objects
 * @returns {Array} Updated price objects with adj_date field
 */
function addAdjustedDates(prices) {
  return prices.map(price => {
    // Skip if already has adj_date
    if (price.adj_date) return price;
    
    // For special cases like "2024 Avg", keep as is
    if (price.date === '2024 Avg') {
      return {
        ...price,
        adj_date: price.date
      };
    }
    
    // For regular dates, calculate the nearest Friday
    return {
      ...price,
      adj_date: getNearestFriday(price.date)
    };
  });
}

class PriceDataManager {
  constructor() {
    this.ensureInitialized();
  }

  async ensureInitialized() {
    this.cache = await this.loadCache();
    this.data = await this.loadData();
    await this.initializeDataStructure();
    
    // Add adjusted dates to existing data
    await this.addAdjustedDatesToExistingData();
  }

  // Add adjusted dates to all existing price data
  async addAdjustedDatesToExistingData() {
    let dataChanged = false;
    
    for (const commodity of Object.keys(this.data)) {
      if (!this.data[commodity]?.prices) continue;
      
      const updatedPrices = addAdjustedDates(this.data[commodity].prices);
      
      if (JSON.stringify(updatedPrices) !== JSON.stringify(this.data[commodity].prices)) {
        this.data[commodity].prices = updatedPrices;
        dataChanged = true;
      }
    }
    
    // Save if data was updated
    if (dataChanged) {
      await this.saveData();
      console.log('Added adjusted dates to existing price data');
    }
  }

  // Ensure proper data structure
  async initializeDataStructure() {
    if (!this.data.eggs) {
      this.data.eggs = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2024: 'static-file',
            2025: 'usda-api'
          }
        },
        prices: []
      };
    }
    
    if (!this.data.milk) {
      this.data.milk = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: {
            2025: 'usda-api'
          }
        },
        prices: []
      };
    }
    
    // Save to ensure proper structure
    await this.saveData();
  }

  // Cache management
  async loadCache() {
    try {
      const cache = await storage.get('price_cache');
      return cache ? JSON.parse(cache) : { means: {} };
    } catch (error) {
      console.error('Error loading cache:', error);
      return { means: {} };
    }
  }

  async saveCache() {
    try {
      await storage.set('price_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  // Data management
  async loadData() {
    try {
      console.log('Loading data from storage');
      const rawData = await storage.get('price_data');
      if (rawData) {
        const data = JSON.parse(rawData);
        console.log('Loaded data with sections:', Object.keys(data));
        return data;
      }
      return {};
    } catch (error) {
      console.error('Error loading price data:', error);
      return {};
    }
  }

  async saveData(data = this.data) {
    try {
      console.log('Saving data with sections:', Object.keys(data));
      
      // Create backup first
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await storage.set(`price_data_backup_${timestamp}`, JSON.stringify(data));
      
      // Save new data
      await storage.set('price_data', JSON.stringify(data));
      this.data = data;
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving price data:', error);
      throw error;
    }
  }

  // Updated addPriceData method with date alignment
  async addPriceData(commodity, newPrices) {
    console.log(`Adding ${newPrices.length} new prices for ${commodity}`);
    
    if (!this.data[commodity]) {
      console.log(`Initializing ${commodity} section`);
      this.data[commodity] = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: commodity === 'eggs' ? 
            { 2024: 'static-file', 2025: 'usda-api' } : 
            { 2025: 'usda-api' }
        },
        prices: []
      };
    }

    const existingPrices = this.data[commodity].prices;
    console.log('Current number of existing prices:', existingPrices.length);
    
    const existingDates = new Set(existingPrices.map(p => p.date));
    
    // Add adjusted dates to new prices
    const pricesToAdd = newPrices
      .filter(p => {
        const isDuplicate = existingDates.has(p.date);
        console.log(`Price for ${p.date}: ${isDuplicate ? 'DUPLICATE' : 'NEW'}`);
        return !isDuplicate;
      })
      .map(p => {
        // Add adjusted date field
        return {
          ...p,
          adj_date: getNearestFriday(p.date)
        };
      });
    
    if (pricesToAdd.length > 0) {
      console.log(`Adding ${pricesToAdd.length} new price points for ${commodity}`);
      
      // Add new prices and sort by date
      this.data[commodity].prices = [...existingPrices, ...pricesToAdd]
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Update metadata
      this.data[commodity].metadata.lastUpdated = new Date().toISOString();
      
      // Save the updated data
      await this.saveData();
      
      console.log(`Updated ${commodity} prices. Total prices:`, this.data[commodity].prices.length);
    } else {
      console.log(`No new prices to add for ${commodity}`);
    }

    return pricesToAdd;
  }
}

// Export singleton instance (but now as async)
const createPriceDataManager = async () => {
  const manager = new PriceDataManager();
  await manager.ensureInitialized();
  return manager;
};

// We'll need to initialize this async now
let priceDataManagerPromise = createPriceDataManager();

async function getPriceDataManager() {
  return await priceDataManagerPromise;
}

// The updatePrices function needs to be adapted to async/await
async function updatePrices(commodity, jsonFilePath) {
  try {
    // ... existing implementation ...
    // Replace direct priceDataManager usage with:
    const priceDataManager = await getPriceDataManager();
    // ... then call the async methods ...
  } catch (error) {
    // ... error handling ...
  }
}

module.exports = {
  addAdjustedDates,
  getPriceDataManager,
  updatePrices
};