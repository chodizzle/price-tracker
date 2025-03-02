import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import YearlyCommodityChart from './YearlyCommodityChart';
import YearlyBasketChart from './YearlyBasketChart';

// Commodity display names and colors
const COMMODITY_CONFIG = {
  // USDA agricultural commodities
  milk: { 
    name: 'Milk (Gallon)',
    color: '#2563eb',      // blue-600
    category: 'agricultural'
  },
  eggs: { 
    name: 'Eggs (Dozen)',
    color: '#d97706',      // amber-600
    category: 'agricultural'
  },
  
  // EIA energy commodities
  gasoline_regular: { 
    name: 'Regular Gasoline (Gallon)',
    color: '#e63946',      // red
    category: 'energy'
  }
};

// Year colors - consistent for all charts
const YEAR_COLORS = {
  2024: '#2563eb',  // blue-600
  2025: '#8884d8'   // purple
};

/**
 * Process the raw data from the API into our year-based format
 */
function processDataByYear(rawData) {
  if (!rawData) return null;
  
  const { charts, basket, metadata } = rawData;
  
  // Find baseline (2024 Avg) for each commodity
  const baselineByChart = {};
  const baselineBasket = basket.find(b => b.adjDate === '2024 Avg');
  
  Object.entries(charts).forEach(([commodity, chartData]) => {
    baselineByChart[commodity] = chartData.data.find(d => d.adjDate === '2024 Avg');
  });
  
  // Find the latest data point for each commodity and the basket
  const latestByChart = {};
  const latestBasket = basket[basket.length - 1];
  
  Object.entries(charts).forEach(([commodity, chartData]) => {
    latestByChart[commodity] = chartData.latest;
  });
  
  return {
    commodityData: charts,
    basketData: basket,
    baselineByChart,
    baselineBasket,
    latestByChart,
    latestBasket,
    metadata
  };
}

export default function YearlyPriceTracker() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch price data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching price data from API...');
      const response = await fetch('/api/prices');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        
        // Special handling for 404 with "not available"
        if (response.status === 404 && errorText.includes('not available')) {
          throw new Error('Price data not initialized yet. Please go to the admin page to initialize data.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Parse the API response
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      // Verify we have the required data structure
      if (!result.data || !result.data.basket || !result.data.charts) {
        throw new Error('Invalid data structure received from API');
      }
      
      console.log('Received price data:', 
        Object.keys(result.data.charts).length, 'commodities,',
        result.data.basket.length, 'data points');
      
      // Process data into yearly format
      const processed = processDataByYear(result.data);
      setProcessedData(processed);
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Get commodities for display
  const getCommodities = () => {
    if (!processedData?.commodityData) return [];
    return Object.keys(processedData.commodityData);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-e-transparent"></div>
          <p className="mt-4">Loading price data...</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-600 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-medium">Error loading price data</h3>
          </div>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
      
      {!loading && !error && processedData && (
        <>
          {/* Basket chart at the top */}
          <YearlyBasketChart 
            data={processedData.basketData}
            commodityInfo={COMMODITY_CONFIG}
            latest={processedData.latestBasket}
            baseline={processedData.baselineBasket}
            yearColors={YEAR_COLORS}
          />
          
          <div className="mt-8 mb-12 text-center text-sm text-gray-600 max-w-2xl mx-auto">
            <p className="font-medium">The charts show a weekly comparison between 2024 and 2025 prices.</p>
            <p className="mt-2">The basket is calculated using the latest price for each commodity. All prices are in US dollars.</p>
          </div>

          {/* Commodity section header */}
          <h2 className="text-2xl font-bold text-center mt-16 mb-8">Individual Commodity Prices</h2>
          
          {/* Individual commodity charts below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {getCommodities().map(commodity => (
              <YearlyCommodityChart 
                key={commodity}
                title={COMMODITY_CONFIG[commodity]?.name || commodity}
                color={COMMODITY_CONFIG[commodity]?.color || '#333'}
                data={processedData.commodityData[commodity]?.data || []}
                latest={processedData.latestByChart[commodity] || null}
                baseline={processedData.baselineByChart[commodity] || null}
                yearColors={YEAR_COLORS}
              />
            ))}
          </div>
        </>
      )}
      
      {!loading && !error && !processedData && (
        <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="inline-block p-3 bg-gray-100 rounded-full mb-4">
            <AlertTriangle className="h-6 w-6 text-gray-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Price Data Available</h3>
          <p className="text-gray-600 mb-6">Price data hasn&apos;t been initialized yet. Please visit the admin page to initialize the data.</p>
          <a 
            href="/admin"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Admin Page
          </a>
        </div>
      )}
    </div>
  );
}