// src/scripts/process-prices.js
const storage = require('../lib/storage');

/**
 * Format a date for friendly display
 */
function formatDate(dateStr) {
  if (dateStr === '2024 Avg') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Calculate the basket price using the latest price for each commodity
 * @param {Object} prices - Map of commodities to their latest prices
 * @param {Object} quantities - Commodity quantities
 * @returns {number} The total basket price
 */
function calculateBasketPrice(prices, quantities) {
  let totalPrice = 0;
  let itemCount = 0;
  
  Object.entries(prices).forEach(([commodity, price]) => {
    const quantity = quantities[commodity] || 0;
    if (quantity > 0 && price !== null && price !== undefined) {
      totalPrice += price * quantity;
      itemCount += quantity;
    }
  });
  
  // Return null if no valid prices
  if (itemCount === 0) return null;
  
  // Return the total price
  return totalPrice;
}

/**
 * Process the raw price data to create a combined dataset without nearest-Friday adjustment
 */
async function processPrices() {
  try {
    console.log('Processing price data...');
    
    // Read raw price data from storage
    const rawDataStr = await storage.get('price_data');
    if (!rawDataStr) {
      throw new Error('Raw price data not found in storage');
    }
    
    // Safely parse the data, handling both string and object formats
    let rawData;
    try {
      if (typeof rawDataStr === 'string') {
        rawData = JSON.parse(rawDataStr);
      } else if (typeof rawDataStr === 'object' && rawDataStr !== null) {
        console.warn('Warning: price_data was already an object, not a string');
        rawData = rawDataStr;
      } else {
        throw new Error(`Unexpected data type: ${typeof rawDataStr}`);
      }
    } catch (parseError) {
      console.error('Error parsing raw price data:', parseError, 'Data was:', rawDataStr);
      throw new Error(`Failed to parse price data: ${parseError.message}`);
    }
    
    console.log('Loaded raw price data with commodities:', Object.keys(rawData));
    
    // Define commodity quantities for basket
    const quantities = {
      // USDA agricultural commodities
      eggs: 1,   // 1 dozen per week
      milk: 1,   // 1 gallon per week
      
      // EIA energy commodities
      gasoline_regular: 1    // 1 gallon per week
    };
  
    
    // Create processed data structure with charts initialized
    const processedData = {
      metadata: {
        lastProcessed: new Date().toISOString(),
        quantities,
        commodities: {}
      },
      alignedPrices: [],
      basket: [],
      charts: {}
    };
    
    // Track all unique dates (no adjustment)
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
      
      // Group prices by actual date (no adjustment)
      const pricesByDate = new Map();
      
      commodityData.prices.forEach(price => {
        const actualDate = price.date;
        
        // Track all unique dates
        allDates.add(actualDate);
        
        // Group by date
        if (pricesByDate.has(actualDate)) {
          const group = pricesByDate.get(actualDate);
          group.prices.push(price);
          group.totalPrice += price.price;
          group.minPrice = Math.min(group.minPrice, price.minPrice || price.price);
          group.maxPrice = Math.max(group.maxPrice, price.maxPrice || price.price);
        } else {
          pricesByDate.set(actualDate, {
            date: actualDate,
            prices: [price],
            totalPrice: price.price,
            minPrice: price.minPrice || price.price,
            maxPrice: price.maxPrice || price.price
          });
        }
      });
      
      // Calculate averages for groups with multiple prices
      pricesByDate.forEach((group, date) => {
        const avgPrice = group.totalPrice / group.prices.length;
        
        // Add to aligned prices
        processedData.alignedPrices.push({
          commodity,
          date: group.date,
          price: avgPrice,
          minPrice: group.minPrice,
          maxPrice: group.maxPrice,
          isAggregated: group.prices.length > 1,
          priceCount: group.prices.length
        });
      });
      
      // Initialize chart data for this commodity
      if (!processedData.charts[commodity]) {
        processedData.charts[commodity] = {
          data: []
        };
      }
    });
    
    console.log(`Found ${allDates.size} unique dates`);
    
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
            price: baseline,
            minPrice: baseline,
            maxPrice: baseline,
            isAggregated: false,
            priceCount: 1
          });
          
          // Add to chart data
          if (!processedData.charts[commodity]) {
            processedData.charts[commodity] = { data: [] };
          }
          
          processedData.charts[commodity].data.push({
            date: '2024 Avg',
            price: baseline,
            minPrice: baseline,
            maxPrice: baseline,
            formattedDate: '2024 Avg'
          });
        }
      });
      
      // Calculate baseline basket price
      const baselineBasketPrice = calculateBasketPrice(baselinePrices, quantities);
      
      if (baselineBasketPrice !== null) {
        processedData.basket.push({
          date: '2024 Avg',
          basketPrice: baselineBasketPrice,
          prices: baselinePrices,
          formattedDate: '2024 Avg',
          isComplete: Object.keys(quantities).every(c => baselinePrices[c] !== undefined)
        });
      }
    }
    
    // Get the latest price for each commodity
    const getLatestPriceForCommodity = (commodity) => {
      const alignedPrices = processedData.alignedPrices
        .filter(p => p.commodity === commodity && p.date !== '2024 Avg')
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return alignedPrices.length > 0 ? alignedPrices[0].price : null;
    };
    
    // Process regular data points for each actual date (no adjustment)
    sortedDates.forEach(date => {
      if (date === '2024 Avg') return; // Skip baseline, already handled
      
      // Get all prices for this date across commodities
      const dateData = {};
      Object.keys(rawData).forEach(commodity => {
        const aligned = processedData.alignedPrices.find(p => 
          p.commodity === commodity && p.date === date
        );
        dateData[commodity] = aligned ? aligned.price : null;
      });
      
      // Fill in missing prices with the latest available price
      const dateWithLatestPrices = { ...dateData };
      let usedLatestPrices = false;
      
      Object.keys(quantities).forEach(commodity => {
        if (dateWithLatestPrices[commodity] === null) {
          dateWithLatestPrices[commodity] = getLatestPriceForCommodity(commodity);
          if (dateWithLatestPrices[commodity] !== null) {
            usedLatestPrices = true;
          }
        }
      });
      
      // Add to chart data for each commodity
      Object.keys(rawData).forEach(commodity => {
        const price = processedData.alignedPrices.find(p => 
          p.commodity === commodity && p.date === date
        );
        
        if (price) {
          if (!processedData.charts[commodity]) {
            processedData.charts[commodity] = { data: [] };
          }
          
          processedData.charts[commodity].data.push({
            date: price.date,
            price: price.price,
            minPrice: price.minPrice,
            maxPrice: price.maxPrice,
            formattedDate: formatDate(price.date)
          });
        }
      });
      
      // Calculate basket price using actual prices for the date
      const basketPrice = calculateBasketPrice(dateData, quantities);
      
      // Also calculate basket with latest prices filled in for missing values
      const basketWithLatestPrices = calculateBasketPrice(dateWithLatestPrices, quantities);
      
      if (basketPrice !== null) {
        processedData.basket.push({
          date,
          basketPrice,
          prices: { ...dateData },
          formattedDate: formatDate(date),
          isComplete: Object.keys(quantities).every(c => dateData[c] !== null)
        });
      } else if (basketWithLatestPrices !== null && usedLatestPrices) {
        // If we couldn't calculate a basket with just this date's prices,
        // but could with the latest available prices, add that instead
        processedData.basket.push({
          date,
          basketPrice: basketWithLatestPrices,
          prices: { ...dateWithLatestPrices },
          formattedDate: formatDate(date),
          isComplete: false,
          usedLatestPrices: true
        });
      }
    });
    
    // Sort basket data by date
    processedData.basket.sort((a, b) => {
      if (a.date === '2024 Avg') return -1;
      if (b.date === '2024 Avg') return 1;
      return new Date(a.date) - new Date(b.date);
    });
    
    // Add a calculation of period-over-period changes
    processedData.basket.forEach((item, index) => {
      if (index > 0 && item.date !== '2024 Avg') {
        const prev = processedData.basket[index - 1];
        if (prev.date !== '2024 Avg') {
          item.change = {
            amount: item.basketPrice - prev.basketPrice,
            percent: ((item.basketPrice - prev.basketPrice) / prev.basketPrice) * 100
          };
        }
      }
    });
    
    // Sort aligned prices by date, then commodity
    processedData.alignedPrices.sort((a, b) => {
      if (a.date === '2024 Avg') return -1;
      if (b.date === '2024 Avg') return 1;
      
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      return a.commodity.localeCompare(b.commodity);
    });
    
    // Process each commodity's chart data
    Object.keys(rawData).forEach(commodity => {
      // Skip if no chart data initialized
      if (!processedData.charts[commodity]) return;
      
      // Get display name from metadata if available
      const displayName = rawData[commodity]?.metadata?.name || commodity;
      
      // Sort the data by date
      processedData.charts[commodity].data.sort((a, b) => {
        if (a.date === '2024 Avg') return -1;
        if (b.date === '2024 Avg') return 1;
        return new Date(a.date) - new Date(b.date);
      });
      
      // Calculate change percentages
      processedData.charts[commodity].data.forEach((item, index) => {
        if (index > 0 && item.date !== '2024 Avg') {
          const prev = processedData.charts[commodity].data[index - 1];
          if (prev.date !== '2024 Avg') {
            item.change = {
              amount: item.price - prev.price,
              percent: ((item.price - prev.price) / prev.price) * 100
            };
          }
        }
      });
      
      // Get latest price
      const nonBaselineData = processedData.charts[commodity].data.filter(d => d.date !== '2024 Avg');
      const latestPoint = nonBaselineData.length > 0 
        ? nonBaselineData[nonBaselineData.length - 1] 
        : null;
      
      if (latestPoint) {
        processedData.charts[commodity].latest = latestPoint;
      }
      
      // Get comparison to 2024 average
      const baselinePoint = processedData.charts[commodity].data.find(p => p.date === '2024 Avg');
      if (baselinePoint && latestPoint) {
        processedData.charts[commodity].vsBaseline = {
          amount: latestPoint.price - baselinePoint.price,
          percent: ((latestPoint.price - baselinePoint.price) / baselinePoint.price) * 100
        };
      }
    });
    
    // Add latest values for basket
    if (processedData.basket.length > 0) {
      const nonBaselineBasket = processedData.basket.filter(b => b.date !== '2024 Avg');
      const latestBasket = nonBaselineBasket.length > 0 
        ? nonBaselineBasket[nonBaselineBasket.length - 1] 
        : null;
      
      if (latestBasket) {
        processedData.metadata.latest = {
          basketPrice: latestBasket.basketPrice,
          date: latestBasket.date
        };
        
        // Compare to 2024 average
        const baselineBasket = processedData.basket.find(b => b.date === '2024 Avg');
        
        if (baselineBasket) {
          processedData.metadata.latest.vsBaseline = {
            amount: latestBasket.basketPrice - baselineBasket.basketPrice,
            percent: ((latestBasket.basketPrice - baselineBasket.basketPrice) / baselineBasket.basketPrice) * 100
          };
        }
      }
    }
    
    // Write the processed data to storage - make sure it's a string
    try {
      await storage.set('combined_price_data', JSON.stringify(processedData));
      console.log('Processed data written to storage');
    } catch (saveError) {
      console.error('Error saving processed data:', saveError);
      throw saveError;
    }
    
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