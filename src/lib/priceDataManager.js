// src/lib/priceDataManager.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const CACHE_FILE = path.join(DATA_DIR, 'cache.json');

class PriceDataManager {
  constructor() {
    this.ensureDirectories();
    this.cache = this.loadCache();
    this.data = this.loadData();
    this.initializeDataStructure();
  }

  // Ensure proper data structure
  initializeDataStructure() {
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
    this.saveData();
  }

  // Directory and file initialization
  ensureDirectories() {
    [DATA_DIR, BACKUP_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Cache management
  loadCache() {
    try {
      return fs.existsSync(CACHE_FILE) 
        ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
        : { means: {} };
    } catch (error) {
      console.error('Error loading cache:', error);
      return { means: {} };
    }
  }

  saveCache() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  // Data file management
  loadData() {
    try {
      console.log('Loading data from:', PRICES_FILE);
      if (fs.existsSync(PRICES_FILE)) {
        const data = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
        console.log('Loaded data with sections:', Object.keys(data));
        return data;
      }
      return {};
    } catch (error) {
      console.error('Error loading price data:', error);
      return {};
    }
  }

  saveData(data = this.data) {
    try {
      console.log('Saving data with sections:', Object.keys(data));
      // Create backup first
      if (fs.existsSync(PRICES_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `prices-${timestamp}.json`);
        fs.copyFileSync(PRICES_FILE, backupFile);
      }
      
      // Save new data
      fs.writeFileSync(PRICES_FILE, JSON.stringify(data, null, 2));
      this.data = data;
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving price data:', error);
      throw error; // Propagate error to handle it in calling code
    }
  }
/**
 * Date alignment utility functions to be added to priceDataManager.js
 */

/**
 * Determines if a date string is a Friday
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {boolean} True if the date is a Friday
 */
function isFriday(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z'); // Use noon UTC to avoid timezone issues
  return date.getUTCDay() === 5; // 5 = Friday in UTC
}

/**
 * Gets the nearest Friday for a date, preferring the current Friday if it is one,
 * otherwise using the previous Friday. Never crosses year boundaries.
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string} Nearest Friday in YYYY-MM-DD format
 */
function getNearestFriday(dateStr) {
  // Special case for 2024 Avg
  if (dateStr === '2024 Avg') return dateStr;
  
  // Parse the date, using noon UTC to avoid timezone issues
  const date = new Date(dateStr + 'T12:00:00Z');
  const originalYear = date.getUTCFullYear();
  
  // If already a Friday, return as is
  if (date.getUTCDay() === 5) {
    return dateStr;
  }
  
  // Calculate days to go back to previous Friday
  let daysToSubtract = date.getUTCDay();
  if (daysToSubtract < 5) {
    // For days 0-4 (Sun-Thu), go back by day + 2 (except Sunday)
    daysToSubtract = daysToSubtract === 0 ? 2 : daysToSubtract + 2;
  } else {
    // For day 6 (Saturday), go back 1 day
    daysToSubtract = 1;
  }
  
  // Create a new date by subtracting days
  const adjustedDate = new Date(date);
  adjustedDate.setUTCDate(date.getUTCDate() - daysToSubtract);
  
  // Check if we've crossed a year boundary
  if (adjustedDate.getUTCFullYear() !== originalYear) {
    // If crossing year boundary, use the original date
    return dateStr;
  }
  
  // Format as YYYY-MM-DD
  return adjustedDate.toISOString().split('T')[0];
}

/**
 * Adds adjusted date field to price data
 * @param {Array} prices - Array of price objects
 * @returns {Array} Updated price objects with adj_date field
 */
function addAdjustedDates(prices) {
  return prices.map(price => {
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
  // Update to the addPriceData method in priceDataManager.js

addPriceData(commodity, newPrices) {
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
    this.saveData();
    
    console.log(`Updated ${commodity} prices. Total prices:`, this.data[commodity].prices.length);
  } else {
    console.log(`No new prices to add for ${commodity}`);
  }

  return pricesToAdd;
}

  static parseAPIData(jsonFilePath) {
    try {
      console.log('Parsing API data from:', jsonFilePath);
      const text = require('fs').readFileSync(jsonFilePath, 'utf8');
      const data = JSON.parse(text);
      
      const isMilk = jsonFilePath.includes('milk');
      const isEggs = jsonFilePath.includes('eggs');
      
      console.log('Is milk data:', isMilk);
      console.log('Is eggs data:', isEggs);
  
      let prices;
      if (isMilk) {
        prices = data.results
          .filter(item => 
            item.region === 'National' && 
            item.organic === 'No' && 
            item.package === 'Gallon'
          )
          .map(item => ({
            date: new Date(item.report_begin_date).toISOString().split('T')[0],
            price: parseFloat(item.wtd_avg_price),
            minPrice: parseFloat(item.wtd_avg_price),
            maxPrice: parseFloat(item.wtd_avg_price),
            storeCount: parseInt(item.store_count || 0)
          }));
      } else if (isEggs) {
        // Filter for national records with Extra Large White Eggs
        prices = data.results
          .filter(item => 
            item.region === 'National' && 
            item.class === 'Extra Large' && 
            item.color === 'White' &&
            item.environment === 'Caged'
          )
          .map(item => ({
            date: new Date(item.report_begin_date).toISOString().split('T')[0],
            price: parseFloat(item.avg_price) / 100,  // Convert cents to dollars
            minPrice: parseFloat(item.price_low) / 100,
            maxPrice: parseFloat(item.price_high) / 100,
            storeCount: 0  // No store count in egg data
          }));
      } else {
        throw new Error('Unsupported commodity');
      }
  
      // Sort by date
      prices = prices.sort((a, b) => new Date(a.date) - new Date(b.date));
  
      console.log(`Parsed ${prices.length} prices from data`);
      console.log('Sample parsed prices:', JSON.stringify(prices.slice(0, 2), null, 2));
  
      return prices;
    } catch (error) {
      console.error('Error parsing API data:', error);
      throw error;
    }
  }

  // Cache access methods
  getCachedMeans(commodity, startDate, endDate) {
    const cacheKey = `${commodity}-${startDate}-${endDate}`;
    return this.cache.means[cacheKey];
  }

  setCachedMeans(commodity, startDate, endDate, data) {
    const cacheKey = `${commodity}-${startDate}-${endDate}`;
    this.cache.means[cacheKey] = {
      data,
      timestamp: Date.now()
    };
    this.saveCache();
  }
}

// Export singleton instance
const priceDataManager = new PriceDataManager();

async function updatePrices(commodity, jsonFilePath) {
    try {
      console.log('=== START updatePrices ===');
      console.log('Commodity:', commodity);
      console.log('JSON File Path:', jsonFilePath);
  
      // Handle both relative and absolute paths
      const fullPath = path.isAbsolute(jsonFilePath) 
        ? jsonFilePath 
        : path.join(process.cwd(), 'data', 'raw', jsonFilePath);
      
      console.log('Full resolved path:', fullPath);
      
      // Verify file exists with Node.js fs
      const fs = require('fs');
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ File NOT FOUND: ${fullPath}`);
        throw new Error(`File not found: ${fullPath}`);
      }
  
      // Read file with error handling
      let rawData;
      try {
        rawData = fs.readFileSync(fullPath, 'utf8');
      } catch (readError) {
        console.error('❌ Error reading file:', readError);
        throw readError;
      }
  
      // Parse JSON with error handling
      let parsedData;
      try {
        parsedData = JSON.parse(rawData);
      } catch (parseError) {
        console.error('❌ Error parsing JSON:', parseError);
        throw parseError;
      }
  
      console.log('Total raw records:', parsedData.results.length);
      
      // Detailed first record logging
      console.log('First raw record:', JSON.stringify(parsedData.results[0], null, 2));
      
      // Parse API data
      const newPrices = PriceDataManager.parseAPIData(fullPath);
      console.log(`Parsed ${newPrices.length} prices from file`);
      
      // Log sample parsed prices
      console.log('Sample parsed prices:', JSON.stringify(newPrices.slice(0, 2), null, 2));
      
      // Add prices
      const addedPrices = priceDataManager.addPriceData(commodity, newPrices);
      console.log(`Added ${addedPrices.length} new ${commodity} price points`);
      
      console.log('=== END updatePrices ===');
      return addedPrices;
    } catch (error) {
      console.error('❌ FATAL ERROR in updatePrices:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }



// Export for use in priceDataManager or other modules
module.exports = {
  isFriday,
  getNearestFriday,
  priceDataManager,
  updatePrices
};