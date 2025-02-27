// src/scripts/process-prices.js
const fs = require('fs');
const path = require('path');

// File paths
const DATA_DIR = path.join(process.cwd(), 'data');
const PRICES_FILE = path.join(DATA_DIR, 'prices.json');
const COMBINED_FILE = path.join(DATA_DIR, 'combined-prices.json');

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
 * Format a date for friendly display
 */
function formatDate(dateStr) {
  if (dateStr === '2024 Avg') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Calculate the basket price based on weighted commodity prices
 * @param {Object} pricesByDate - Map of prices indexed by date
 * @param {Object} weights - Commodity weights
 * @returns {number} The weighted basket price
 */
function calculateBasketPrice(pricesByDate, weights) {
  let totalPrice = 0;
  let totalWeight = 0;
  
  Object.entries(pricesByDate).forEach(([commodity, price]) => {
    const weight = weights[commodity] || 0;
    if (weight > 0 && price !== null && price !== undefined) {
      totalPrice += price * weight;
      totalWeight += weight;
    }
  });
  
  // Return null if no valid prices
  if (totalWeight === 0) return null;
  
  // Calculate weighted average
  return totalPrice / totalWeight;
}

/**
 * Process the raw price data to create a combined dataset
 */
async function processPrices() {
  try {
    console.log('Processing price data...');
    
    // Read raw price data
    if (!fs.existsSync(PRICES_FILE)) {
      throw new Error(`Raw price file not found: ${PRICES_FILE}`);
    }
    
    const rawData = JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
    console.log('Loaded raw price data with commodities:', Object.keys(rawData));
    
    // Define commodity weights (weekly consumption)
    const weights = {
      eggs: 1,  // 1 dozen per week
      milk: 2   // 2 gallons per week
    };
    
    // Create processed data structure
    const processedData = {
      metadata: {
        lastProcessed: new Date().toISOString(),
        weights,
        commodities: {}
      },
      alignedPrices: [],
      basket: []
    };
    
    // Track all unique adjusted dates
    const allDates = new Set();
    
    // Process each commodity's data
    Object.keys(rawData).forEach(commodity => {
      console.log(`Processing ${commodity} data...`);
      
      const commodityData = rawData[commodity];
      
      // Skip if no prices
      if (!commodityData?.prices || commodityData.prices.length === 0) {
        console.log(`No price data for ${commodity}`);
        return;
      }
      
      // Store commodity metadata
      processedData.metadata.commodities[commodity] = {
        ...commodityData.metadata,
        priceCount: commodityData.prices.length
      };
      
      // Group prices by adjusted date
      const pricesByAdjDate = new Map();
      
      commodityData.prices.forEach(price => {
        // Use existing adj_date if available, otherwise calculate it
        const adjDate = price.adj_date || getNearestFriday(price.date);
        
        // Only process 2025 data for weekly prices (keep 2024 Avg)
        if (!price.date.startsWith('2025') && price.date !== '2024 Avg') {
          return;
        }
        
        // Track all unique dates
        allDates.add(adjDate);
        
        // Group by adjusted date
        if (pricesByAdjDate.has(adjDate)) {
          const group = pricesByAdjDate.get(adjDate);
          group.prices.push(price);
          group.totalPrice += price.price;
          group.minPrice = Math.min(group.minPrice, price.minPrice || price.price);
          group.maxPrice = Math.max(group.maxPrice, price.maxPrice || price.price);
        } else {
          pricesByAdjDate.set(adjDate, {
            date: price.date,
            adjDate,
            prices: [price],
            totalPrice: price.price,
            minPrice: price.minPrice || price.price,
            maxPrice: price.maxPrice || price.price
          });
        }
      });
      
      // Calculate averages for groups with multiple prices
      pricesByAdjDate.forEach((group, adjDate) => {
        const avgPrice = group.totalPrice / group.prices.length;
        
        // Add to aligned prices
        processedData.alignedPrices.push({
          commodity,
          date: group.date,
          adjDate,
          price: avgPrice,
          minPrice: group.minPrice,
          maxPrice: group.maxPrice,
          isAggregated: group.prices.length > 1,
          priceCount: group.prices.length
        });
      });
    });
    
    console.log(`Found ${allDates.size} unique adjusted dates`);
    
    // Create basket data by combining all commodities
    const sortedDates = Array.from(allDates).sort();
    
    // Add 2024 baseline data if available
    const hasBaseline = Object.keys(rawData).some(commodity => 
      rawData[commodity]?.metadata?.baseline?.['2024']?.annualMean
    );
    
    if (hasBaseline) {
      // Add 2024 average as baseline
      const baselinePrices = {};
      Object.keys(rawData).forEach(commodity => {
        const baseline = rawData[commodity]?.metadata?.baseline?.['2024']?.annualMean;
        if (baseline) {
          baselinePrices[commodity] = baseline;
          
          // Add to aligned prices
          processedData.alignedPrices.push({
            commodity,
            date: '2024 Avg',
            adjDate: '2024 Avg',
            price: baseline,
            minPrice: baseline,
            maxPrice: baseline,
            isAggregated: false,
            priceCount: 1
          });
        }
      });
      
      // Calculate baseline basket price
      const baselineBasketPrice = calculateBasketPrice(baselinePrices, weights);
      
      if (baselineBasketPrice !== null) {
        processedData.basket.push({
          date: '2024 Avg',
          adjDate: '2024 Avg',
          basketPrice: baselineBasketPrice,
          prices: baselinePrices,
          formattedDate: '2024 Avg',
          isComplete: Object.keys(weights).every(c => baselinePrices[c] !== undefined)
        });
      }
    }
    
    // Process regular data points
    sortedDates.forEach(adjDate => {
      if (adjDate === '2024 Avg') return; // Skip baseline, already handled
      
      // Get prices for all commodities on this date
      const dateData = {};
      Object.keys(rawData).forEach(commodity => {
        const aligned = processedData.alignedPrices.find(p => 
          p.commodity === commodity && p.adjDate === adjDate
        );
        dateData[commodity] = aligned ? aligned.price : null;
      });
      
      // Calculate basket price
      const basketPrice = calculateBasketPrice(dateData, weights);
      
      if (basketPrice !== null) {
        processedData.basket.push({
          date: adjDate, // Use adjusted date as the main date
          adjDate,
          basketPrice,
          prices: { ...dateData }, // Copy of all commodity prices
          formattedDate: formatDate(adjDate),
          isComplete: Object.keys(weights).every(c => dateData[c] !== null)
        });
      }
    });
    
    // Sort basket data by date
    processedData.basket.sort((a, b) => {
      if (a.adjDate === '2024 Avg') return -1;
      if (b.adjDate === '2024 Avg') return 1;
      return new Date(a.adjDate) - new Date(b.adjDate);
    });
    
    // Add a calculation of period-over-period changes
    processedData.basket.forEach((item, index) => {
      if (index > 0 && item.adjDate !== '2024 Avg') {
        const prev = processedData.basket[index - 1];
        if (prev.adjDate !== '2024 Avg') {
          item.change = {
            amount: item.basketPrice - prev.basketPrice,
            percent: ((item.basketPrice - prev.basketPrice) / prev.basketPrice) * 100
          };
        }
      }
    });
    
    // Sort aligned prices by date, then commodity
    processedData.alignedPrices.sort((a, b) => {
      if (a.adjDate === '2024 Avg') return -1;
      if (b.adjDate === '2024 Avg') return 1;
      
      const dateCompare = new Date(a.adjDate) - new Date(b.adjDate);
      if (dateCompare !== 0) return dateCompare;
      
      return a.commodity.localeCompare(b.commodity);
    });
    
    // Create commodity-specific charts data
    processedData.charts = {};
    Object.keys(rawData).forEach(commodity => {
      processedData.charts[commodity] = {
        data: processedData.alignedPrices
          .filter(p => p.commodity === commodity)
          .map(p => ({
            date: p.date,
            adjDate: p.adjDate,
            price: p.price,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            formattedDate: formatDate(p.adjDate)
          }))
      };
      
      // Calculate change percentages
      processedData.charts[commodity].data.forEach((item, index) => {
        if (index > 0 && item.adjDate !== '2024 Avg') {
          const prev = processedData.charts[commodity].data[index - 1];
          if (prev.adjDate !== '2024 Avg') {
            item.change = {
              amount: item.price - prev.price,
              percent: ((item.price - prev.price) / prev.price) * 100
            };
          }
        }
      });
      
      // Get latest price
      const latestPoint = processedData.charts[commodity].data[processedData.charts[commodity].data.length - 1];
      processedData.charts[commodity].latest = latestPoint;
      
      // Get comparison to 2024 average
      const baselinePoint = processedData.charts[commodity].data.find(p => p.adjDate === '2024 Avg');
      if (baselinePoint && latestPoint) {
        processedData.charts[commodity].vsBaseline = {
          amount: latestPoint.price - baselinePoint.price,
          percent: ((latestPoint.price - baselinePoint.price) / baselinePoint.price) * 100
        };
      }
    });
    
    // Add latest values for basket
    if (processedData.basket.length > 0) {
      processedData.metadata.latest = {
        basketPrice: processedData.basket[processedData.basket.length - 1].basketPrice,
        date: processedData.basket[processedData.basket.length - 1].adjDate
      };
      
      // Compare to 2024 average
      const baselineBasket = processedData.basket.find(b => b.adjDate === '2024 Avg');
      const latestBasket = processedData.basket[processedData.basket.length - 1];
      
      if (baselineBasket && latestBasket) {
        processedData.metadata.latest.vsBaseline = {
          amount: latestBasket.basketPrice - baselineBasket.basketPrice,
          percent: ((latestBasket.basketPrice - baselineBasket.basketPrice) / baselineBasket.basketPrice) * 100
        };
      }
    }
    
    // Write the processed data
    fs.writeFileSync(COMBINED_FILE, JSON.stringify(processedData, null, 2));
    console.log(`Processed data written to ${COMBINED_FILE}`);
    
    return processedData;
  } catch (error) {
    console.error('Error processing price data:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  processPrices()
    .then(() => console.log('Price data processing complete!'))
    .catch(error => {
      console.error('Failed to process price data:', error);
      process.exit(1);
    });
}

module.exports = { processPrices };