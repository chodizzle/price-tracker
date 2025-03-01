// src/scripts/process-prices.js
const storage = require('../lib/storage');
const { getNearestFriday, isFriday } = require('../lib/utils');

/**
 * Format a date for friendly display
 */
function formatDate(dateStr) {
  if (dateStr === '2024 Avg') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Calculate the basket price as a straight sum of items
 * @param {Object} pricesByDate - Map of prices indexed by date
 * @param {Object} quantities - Commodity quantities
 * @returns {number} The total basket price
 */
function calculateBasketPrice(pricesByDate, quantities) {
  let totalPrice = 0;
  let itemCount = 0;
  
  Object.entries(pricesByDate).forEach(([commodity, price]) => {
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
 * Process the raw price data to create a combined dataset
 */
async function processPrices() {
  try {
    console.log('Processing price data...');
    
    // Read raw price data from storage
    const rawDataStr = await storage.get('price_data');
    if (!rawDataStr) {
      throw new Error('Raw price data not found in storage');
    }
    
    const rawData = JSON.parse(rawDataStr);
    console.log('Loaded raw price data with commodities:', Object.keys(rawData));
    
    // Define commodity quantities for basket
    const quantities = {
      // USDA agricultural commodities
      eggs: 1,   // 1 dozen per week
      milk: 1,   // 1 gallon per week
      
      // EIA energy commodities
      gasoline_regular: 1    // 1 gallon per week
    };
  
    
    // Create processed data structure - Make sure charts is initialized here
    const processedData = {
      metadata: {
        lastProcessed: new Date().toISOString(),
        quantities,
        commodities: {}
      },
      alignedPrices: [],
      basket: [],
      charts: {}  // Initialize charts object here
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
      const baselineBasketPrice = calculateBasketPrice(baselinePrices, quantities);
      
      if (baselineBasketPrice !== null) {
        processedData.basket.push({
          date: '2024 Avg',
          adjDate: '2024 Avg',
          basketPrice: baselineBasketPrice,
          prices: baselinePrices,
          formattedDate: '2024 Avg',
          isComplete: Object.keys(quantities).every(c => baselinePrices[c] !== undefined)
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
      const basketPrice = calculateBasketPrice(dateData, quantities);
      
      if (basketPrice !== null) {
        processedData.basket.push({
          date: adjDate, // Use adjusted date as the main date
          adjDate,
          basketPrice,
          prices: { ...dateData }, // Copy of all commodity prices
          formattedDate: formatDate(adjDate),
          isComplete: Object.keys(quantities).every(c => dateData[c] !== null)
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
    
    // Ensure proper commodity names are used in the charts:
    Object.keys(rawData).forEach(commodity => {
      // Convert commodity keys to lowercase for consistency
      const commodityId = commodity.toLowerCase();
      
      // Get display name from metadata if available
      const displayName = rawData[commodity]?.metadata?.name || commodityId;
      
      // Initialize the chart data for this commodity
      processedData.charts[commodityId] = {
        data: processedData.alignedPrices
          .filter(p => p.commodity === commodityId)
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
      processedData.charts[commodityId].data.forEach((item, index) => {
        if (index > 0 && item.adjDate !== '2024 Avg') {
          const prev = processedData.charts[commodityId].data[index - 1];
          if (prev.adjDate !== '2024 Avg') {
            item.change = {
              amount: item.price - prev.price,
              percent: ((item.price - prev.price) / prev.price) * 100
            };
          }
        }
      });
      
      // Get latest price
      const latestPoint = processedData.charts[commodityId].data[processedData.charts[commodityId].data.length - 1];
      processedData.charts[commodityId].latest = latestPoint;
      
      // Get comparison to 2024 average
      const baselinePoint = processedData.charts[commodityId].data.find(p => p.adjDate === '2024 Avg');
      if (baselinePoint && latestPoint) {
        processedData.charts[commodityId].vsBaseline = {
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
    
    // Write the processed data to storage
    await storage.set('combined_price_data', JSON.stringify(processedData));
    console.log('Processed data written to storage');
    
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