// src/services/priceAPIs.js

// Helper function to format dates for the API
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  const fetchGroceryPrices = async (item, startDate, endDate) => {
    try {
      const response = await fetch(
        `/api/prices?commodity=${item}&fromDate=${startDate}&toDate=${endDate}`
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching grocery prices:', error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  };
  
  export { fetchGroceryPrices, formatDate };