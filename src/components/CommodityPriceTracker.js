'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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

/**
 * Custom tooltip for price charts
 */
const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  // Find the basketPrice if available
  const basketData = payload.find(entry => entry.dataKey === 'basketPrice');
  
  return (
    <div className="bg-white p-3 border rounded shadow-lg">
      <p className="font-semibold">{label}</p>
      {basketData && (
        <p className="font-medium text-purple-700 border-b pb-1 mb-1">
          Basket Total: ${Number(basketData.value).toFixed(2)}
        </p>
      )}
      {payload.map((entry, index) => {
        // Skip the basket total in the detailed breakdown
        if (entry.dataKey === 'basketPrice') return null;
        
        // Extract commodity name from the dataKey (e.g., prices.eggs → eggs)
        const commodityKey = entry.dataKey.split('.')[1];
        if (!commodityKey) return null;
        
        const config = COMMODITY_CONFIG[commodityKey];
        if (!config) return null;
        
        return (
          <p 
            key={index} 
            style={{ color: config.color }}
            className="font-medium"
          >
            {config.name}: ${Number(entry.value).toFixed(2)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Error boundary component
 */
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center text-red-600 mb-4">
        <AlertTriangle className="h-6 w-6 mr-2" />
        <h3 className="text-lg font-medium">Something went wrong</h3>
      </div>
      <p className="mb-4 text-red-700">{error.message || 'An unexpected error occurred'}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Individual commodity chart component
 */
function CommodityChart({ title, color, data, latest }) {
  if (!data || data.length === 0) return null;
  
  // Handle potential data issues
  const safeData = data.filter(item => 
    item && typeof item === 'object' && typeof item.price === 'number'
  );
  
  if (safeData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-center py-8 text-gray-500">
            No valid price data available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Safely handle missing latest data
  const safeLatest = latest && typeof latest === 'object' ? latest : { price: 0 };
  
  // Get min/max for Y axis
  const prices = safeData.map(item => item.price);
  const minPrice = Math.floor(Math.min(...prices) * 0.9);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.1);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          <span>{title}</span>
          <span className="text-xl font-bold">${safeLatest.price.toFixed(2)}</span>
        </CardTitle>
        {safeLatest.change && (
          <div className="flex items-center text-sm">
            {safeLatest.change.amount > 0 ? (
              <TrendingUp className="text-red-500 h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="text-green-500 h-4 w-4 mr-1" />
            )}
            <span className={safeLatest.change.amount > 0 ? "text-red-600" : "text-green-600"}>
              ${Math.abs(safeLatest.change.amount).toFixed(2)} ({Math.abs(safeLatest.change.percent).toFixed(1)}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <LineChart 
              data={safeData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tickFormatter={(value) => `${value.toFixed(2)}`}
                width={45}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={PriceTooltip} />
              <ReferenceLine x="2024 Avg" stroke="#666" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="price"
                name={title}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Basket chart component
 */
function BasketChart({ data, quantities }) {
  if (!data || data.length === 0) return null;
  
  // Filter to ensure valid data
  const safeData = data.filter(item => 
    item && typeof item === 'object' && typeof item.basketPrice === 'number'
  );
  
  if (safeData.length === 0) {
    return (
      <Card className="h-full mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Weekly Grocery Basket</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-center py-8 text-gray-500">
            No valid basket data available
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const latest = safeData[safeData.length - 1];
  
  // Get min/max for Y axis
  const prices = safeData.map(item => item.basketPrice);
  const minPrice = Math.floor(Math.min(...prices) * 0.9);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.1);
  
  return (
    <Card className="h-full mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          <div className="flex items-center">
            <span className="text-xl">Weekly Grocery Basket</span>
            <span className="text-sm text-gray-500 ml-2">
              ({Object.entries(quantities).map(([name, qty], index) => 
                `${index > 0 ? ' + ' : ''}${qty} ${COMMODITY_CONFIG[name]?.name?.toLowerCase() || name}`
              )})
            </span>
          </div>
          <span className="text-xl font-bold">${latest.basketPrice.toFixed(2)}</span>
        </CardTitle>
        {latest.change && (
          <div className="flex items-center text-sm">
            {latest.change.amount > 0 ? (
              <TrendingUp className="text-red-500 h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="text-green-500 h-4 w-4 mr-1" />
            )}
            <span className={latest.change.amount > 0 ? "text-red-600" : "text-green-600"}>
              ${Math.abs(latest.change.amount).toFixed(2)} ({Math.abs(latest.change.percent).toFixed(1)}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart 
              data={safeData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tickFormatter={(value) => `${value.toFixed(2)}`}
                width={50}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={PriceTooltip} />
              <ReferenceLine x="2024 Avg" stroke="#666" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="basketPrice"
                name="Basket Total"
                stroke="#8884d8"
                strokeWidth={4}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
              {Object.keys(COMMODITY_CONFIG).map(commodity => {
                // Check if this commodity exists in the data
                if (!safeData[0]?.prices || typeof safeData[0].prices[commodity] === 'undefined') {
                  return null;
                }
                
                return (
                  <Line
                    key={commodity}
                    type="monotone"
                    dataKey={`prices.${commodity}`}
                    name={COMMODITY_CONFIG[commodity].name}
                    // stroke={COMMODITY_CONFIG[commodity].color}
                    stroke="rgba(255, 255, 255, 0)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls={true}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main component that combines the other components
 */
export default function CommodityPriceTracker() {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

 // Process data to ensure all commodities are present in latest data point
useEffect(() => {
  if (priceData) {
    // MODIFIED: Show all available data points, don't require all commodities
    const filteredBasket = priceData.basket;
    
    // Include a note about incomplete data points in the latest data
    const incompleteDataPoints = filteredBasket.filter(item => !item.isComplete);
    if (incompleteDataPoints.length > 0) {
      console.log(`Note: ${incompleteDataPoints.length} data points have incomplete commodity data`);
    }
    
    // Use all commodity data regardless of completeness
    setFilteredData({
      ...priceData,
      basket: filteredBasket,
      charts: priceData.charts // Keep all chart data
    });
  }
}, [priceData]);

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
      
      setPriceData(result.data);
      setLoading(false);
      
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Extract commodities from data for display
  const getCommodityNames = () => {
    if (!filteredData?.charts) return [];
    return Object.keys(filteredData.charts);
  };

  // Use filtered data if available, otherwise use the original data
  const displayData = filteredData || priceData;
  const hasData = displayData && displayData.basket && displayData.basket.length > 0;

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
      
      {!loading && !error && hasData && (
        <>
          {/* Basket chart at the top */}
          <BasketChart 
            data={displayData.basket} 
            quantities={displayData.metadata.quantities}
          />
          
          <div className="mt-8 mb-12 text-center text-sm text-gray-600 max-w-2xl mx-auto">
            <p className="font-medium">&quot;2024 Avg&quot; represents the annual average price for 2024.</p>
            <p className="mt-2">Prices are aligned to Fridays for consistent comparison. The basket total is the sum of individual item prices for a basic weekly grocery purchase.</p>
            <p className="mt-2">Scroll down to see individual commodity price trends.</p>
          </div>

          {/* Commodity section header */}
          <h2 className="text-2xl font-bold text-center mt-16 mb-8">Individual Commodity Prices</h2>
          
          {/* Individual commodity charts below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {getCommodityNames().map(commodity => (
              <CommodityChart 
                key={commodity}
                title={COMMODITY_CONFIG[commodity]?.name || commodity}
                color={COMMODITY_CONFIG[commodity]?.color || '#333'}
                data={displayData.charts[commodity]?.data || []}
                latest={displayData.charts[commodity]?.latest || null}
              />
            ))}
          </div>
        </>
      )}
      
      {!loading && !error && !hasData && (
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