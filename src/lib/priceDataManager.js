// src/lib/priceDataManager.js
const storage = require('./storage');

class PriceDataManager {
  constructor() {
    this.ensureInitialized();
  }

  async ensureInitialized() {
    this.cache = await this.loadCache();
    this.data = await this.loadData();
    await this.initializeDataStructure();
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

  // Updated addPriceData method without date alignment
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
    
    // Add prices without adjustment
    const pricesToAdd = newPrices
      .filter(p => {
        const isDuplicate = existingDates.has(p.date);
        console.log(`Price for ${p.date}: ${isDuplicate ? 'DUPLICATE' : 'NEW'}`);
        return !isDuplicate;
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

module.exports = {
  getPriceDataManager
};