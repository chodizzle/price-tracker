'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Calculate rolling average
function addRollingAverage(data, window = 3) {
  if (!data || data.length === 0) return [];
  
  return data.map((item, index) => {
    const priceWindow = data
      .slice(Math.max(0, index - window + 1), index + 1)
      .map(d => d.price);
    
    const average = priceWindow.reduce((sum, price) => sum + price, 0) / priceWindow.length;
    
    return {
      ...item,
      rollingAvg: Number(average.toFixed(2))
    };
  });
}

const CustomTooltip = ({ active, payload, label, visibleLines }) => {
  if (!active || !payload?.[0]) return null;
  
  return (
    <div className="bg-white p-3 border rounded shadow-lg">
      <p className="font-semibold">{label}</p>
      {visibleLines.weeklyPrice && payload[0] && (
        <p className="text-blue-600">
          Price: ${Number(payload[0].value).toFixed(2)}
        </p>
      )}
      {visibleLines.rollingAverage && payload[1] && (
        <p className="text-emerald-600">
          3-Week Avg: ${Number(payload[1].value).toFixed(2)}
        </p>
      )}
    </div>
  );
};

// Main component
export default function CommodityPriceTracker() {
  // State for all commodities data
  const [commoditiesData, setCommoditiesData] = useState({
    milk: { loading: true, data: [], error: null, latestPrice: null, priceChange: null },
    eggs: { loading: true, data: [], error: null, latestPrice: null, priceChange: null },
    bread: { loading: true, data: [], error: null, latestPrice: null, priceChange: null },
    chicken: { loading: true, data: [], error: null, latestPrice: null, priceChange: null }
  });
  
  const [selectedCommodity, setSelectedCommodity] = useState('milk');
  const [visibleLines, setVisibleLines] = useState({
    weeklyPrice: true,
    rollingAverage: true
  });
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Commodity display names and colors
  const COMMODITY_CONFIG = {
    milk: { 
      name: 'Milk (Gallon)',
      colors: {
        price: '#2563eb',        // blue-600
        average: '#059669'       // emerald-600
      }
    },
    eggs: { 
      name: 'Eggs (Dozen)',
      colors: {
        price: '#d97706',        // amber-600
        average: '#db2777'       // pink-600
      }
    },
    bread: { 
      name: 'Bread (Loaf)',
      colors: {
        price: '#9333ea',        // purple-600
        average: '#65a30d'       // lime-600
      }
    },
    chicken: { 
      name: 'Chicken (lb)',
      colors: {
        price: '#dc2626',        // red-600
        average: '#0891b2'       // cyan-600
      }
    }
  };

  // Fetch data from our local API
  const fetchData = async () => {
    try {
      const response = await fetch('/api/prices');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      // Process each commodity's data
      const processedData = {};
      
      Object.keys(result.data).forEach(commodity => {
        if (!result.data[commodity]?.prices) return;
        
        // Add rolling average to the price data
        const prices = addRollingAverage(result.data[commodity].prices);
        
        let latestPrice = null;
        let priceChange = null;

        if (prices.length >= 2) {
          const latest = prices[prices.length - 1];
          const previous = prices[prices.length - 2];
          latestPrice = latest.price;
          priceChange = {
            amount: (latest.price - previous.price).toFixed(2),
            percentage: ((latest.price - previous.price) / previous.price * 100).toFixed(1)
          };
        }

        processedData[commodity] = {
          loading: false,
          data: prices,
          error: null,
          latestPrice,
          priceChange,
          metadata: result.data[commodity].metadata
        };
      });
      
      setCommoditiesData(prev => ({
        ...prev,
        ...processedData
      }));
      
    } catch (err) {
      console.error('Error fetching price data:', err);
      
      // Set error state for all commodities
      const errorState = {};
      Object.keys(commoditiesData).forEach(commodity => {
        errorState[commodity] = {
          ...commoditiesData[commodity],
          loading: false,
          error: err.message
        };
      });
      
      setCommoditiesData(errorState);
    }
  };

  // Handle toggling line visibility
  const handleToggleLine = (line, forcedState) => {
    setVisibleLines(prev => ({
      ...prev,
      [line]: forcedState !== undefined ? forcedState : !prev[line]
    }));
  };
  
  // Handle changing selected commodity
  const handleCommodityChange = (commodity) => {
    setSelectedCommodity(commodity);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Get current commodity data
  const currentData = commoditiesData[selectedCommodity] || { loading: true, data: [], error: null };
  
  // Available commodities (those with data)
  const availableCommodities = useMemo(() => {
    return Object.keys(commoditiesData).filter(commodity => 
      !commoditiesData[commodity].loading && 
      commoditiesData[commodity].data?.length > 0
    );
  }, [commoditiesData]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="relative flex flex-col md:flex-row w-full max-w-6xl mx-auto">
      {/* Mobile toggle for sidebar */}
      <button 
        className="absolute top-4 left-4 p-2 z-20 rounded-full bg-white shadow-md md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>
      
      {/* Sidebar for commodity selection */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out z-10
                      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                      md:relative md:translate-x-0 md:w-64 md:shadow-none`}>
        <div className="p-4 space-y-6">
          <h2 className="text-xl font-bold">Commodities</h2>
          <div className="space-y-2">
            {availableCommodities.map(commodity => (
              <button
                key={commodity}
                onClick={() => handleCommodityChange(commodity)}
                className={`w-full p-3 text-left rounded-lg flex items-center gap-3 transition-colors
                  ${selectedCommodity === commodity 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <div 
                  className="w-4 h-4 rounded-sm" 
                  style={{ backgroundColor: COMMODITY_CONFIG[commodity]?.colors.price || '#333' }}
                />
                <span>{COMMODITY_CONFIG[commodity]?.name || commodity}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {COMMODITY_CONFIG[selectedCommodity]?.name || selectedCommodity} Price Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {/* Stats Panel - only show when data is loaded */}
              {currentData.latestPrice && (
                <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Current Average Price</p>
                    <p className="text-4xl font-bold">${currentData.latestPrice?.toFixed(2)}</p>
                  </div>
                  {currentData.priceChange && (
                    <div className="flex items-center gap-3">
                      {parseFloat(currentData.priceChange.amount) > 0 ? (
                        <TrendingUp className="text-red-500 h-8 w-8" />
                      ) : (
                        <TrendingDown className="text-green-500 h-8 w-8" />
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Change</p>
                        <p className={`text-lg font-semibold ${parseFloat(currentData.priceChange.amount) > 0 ? "text-red-600" : "text-green-600"}`}>
                          ${Math.abs(currentData.priceChange.amount)} ({Math.abs(currentData.priceChange.percentage)}%)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Loading State */}
              {currentData.loading && (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-e-transparent"></div>
                  <p className="mt-4">Loading price data...</p>
                </div>
              )}
              
              {/* Error State */}
              {currentData.error && (
                <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p>Error: {currentData.error}</p>
                  <button 
                    onClick={fetchData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Price Chart */}
              {!currentData.loading && !currentData.error && currentData.data?.length > 0 && (
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex gap-8 mb-6">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-5 h-5 rounded-sm shadow-sm" 
                        style={{ 
                          backgroundColor: COMMODITY_CONFIG[selectedCommodity]?.colors.price || '#333',
                          border: '1px solid rgba(0,0,0,0.1)'
                        }} 
                      />
                      <button
                        onClick={() => handleToggleLine('weeklyPrice')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${visibleLines.weeklyPrice 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        Weekly Price
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-5 h-5 rounded-sm shadow-sm" 
                        style={{ 
                          backgroundColor: COMMODITY_CONFIG[selectedCommodity]?.colors.average || '#333',
                          border: '1px solid rgba(0,0,0,0.1)'
                        }} 
                      />
                      <button
                        onClick={() => handleToggleLine('rollingAverage')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                          ${visibleLines.rollingAverage 
                            ? 'bg-blue-500 text-white hover:bg-blue-600' 
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        3-Week Average Price
                      </button>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 400, border: '2px solid #e5e7eb' }}>
                    <ResponsiveContainer>
                      <LineChart data={currentData.data} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                        />
                        <Tooltip content={(props) => <CustomTooltip {...props} visibleLines={visibleLines} />} />
                        {visibleLines.weeklyPrice && (
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke={COMMODITY_CONFIG[selectedCommodity]?.colors.price || '#2563eb'}
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                        {visibleLines.rollingAverage && (
                          <Line 
                            type="monotone" 
                            dataKey="rollingAvg" 
                            stroke={COMMODITY_CONFIG[selectedCommodity]?.colors.average || '#059669'}
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* No Data State */}
              {!currentData.loading && !currentData.error && (!currentData.data || currentData.data.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No price data available for {COMMODITY_CONFIG[selectedCommodity]?.name || selectedCommodity}.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}