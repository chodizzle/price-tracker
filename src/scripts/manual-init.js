// Modify this section in src/scripts/process-prices.js
// Look for the section that creates the basket data and modify it

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
  
  // Calculate basket price - MODIFIED: Allow partial baskets
  const basketPrice = calculateBasketPrice(dateData, quantities);
  
  if (basketPrice !== null) {
    // Count how many commodities have data
    const availableCommodities = Object.keys(quantities).filter(c => dateData[c] !== null).length;
    const totalCommodities = Object.keys(quantities).length;
    
    processedData.basket.push({
      date: adjDate, // Use adjusted date as the main date
      adjDate,
      basketPrice,
      prices: { ...dateData }, // Copy of all commodity prices
      formattedDate: formatDate(adjDate),
      isComplete: Object.keys(quantities).every(c => dateData[c] !== null),
      commoditiesAvailable: availableCommodities,
      totalCommodities: totalCommodities
    });
  }
});