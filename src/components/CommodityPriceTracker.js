'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Commodity display names and colors
const COMMODITY_CONFIG = {
  milk: { 
    name: 'Milk (Gallon)',
    color: '#2563eb',      // blue-600
  },
  eggs: { 
    name: 'Eggs (Dozen)',
    color: '#d97706',      // amber-600
  },
  bread: { 
    name: 'Bread (Loaf)',
    color: '#9333ea',      // purple-600
  },
  chicken: { 
    name: 'Chicken (lb)',
    color: '#dc2626',      // red-600
  }
};

// Custom tooltip showing all visible commodities
const CustomTooltip = ({ active, payload, label, visibleLines }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  return (
    <div className="bg-white p-3 border rounded shadow-lg">
      <p className="font-semibold">{label}</p>
      {payload.map((entry, index) => {
        // Only show commodities that are visible
        const commodity = entry.dataKey.split('-')[0];
        if (!visibleLines[commodity]) return null;
        
        return (
          <p 
            key={index} 
            style={{ color: COMMODITY_CONFIG[commodity]?.color || '#333' }}
            className="font-medium"
          >
            {COMMODITY_CONFIG[commodity]?.name || commodity}: ${Number(entry.value).toFixed(2)}
          </p>
        );
      })}
    </div>
  );
};

// Prepare data to include annual average and regular price points
function prepareChartData(commoditiesData) {
  const allData = {};
  let dates = new Set();
  
  // First, collect all unique dates and prepare annual averages
  Object.keys(commoditiesData).forEach(commodity => {
    if (!commoditiesData[commodity]?.data) return;
    
    // Add annual average data point if available
    if (commoditiesData[commodity]?.metadata?.baseline?.['2024']?.annualMean) {
      const annualAvg = {
        date: '2024 Avg',
        [`${commodity}-price`]: commoditiesData[commodity].metadata.baseline['2024'].annualMean
      };
      
      allData['2024 Avg'] = {
        ...(allData['2024 Avg'] || {}),
        ...annualAvg
      };
      
      dates.add('2024 Avg');
    }
    
    // Add regular price points
    commoditiesData[commodity].data.forEach(point => {
      if (point.date.startsWith('2025')) { // Only include 2025 data
        dates.add(point.date);
        allData[point.date] = {
          ...(allData[point.date] || {}),
          [`${commodity}-price`]: point.price
        };
      }
    });
  });
  
  // Convert the collected data to an array and sort by date
  const sortedDates = Array.from(dates).sort((a, b) => {
    if (a === '2024 Avg') return -1;
    if (b === '2024 Avg') return 1;
    return new Date(a) - new Date(b);
  });
  
  // Create the chart data with connected points
  const chartData = sortedDates.map(date => ({
    date,
    ...allData[date]
  }));
  
  // Ensure we have consistent property names across all data points
  const allProperties = new Set();
  
  // Find all property names
  chartData.forEach(point => {
    Object.keys(point).forEach(key => {
      if (key !== 'date') {
        allProperties.add(key);
      }
    });
  });
  
  // Make sure all data points have all properties (even if null)
  // This helps Recharts connect the lines properly
  return chartData.map(point => {
    const result = { ...point };
    
    allProperties.forEach(prop => {
      if (!(prop in point)) {
        result[prop] = null;
      }
    });
    
    return result;
  });
}

// Find min and max values for y-axis
function getYDomain(chartData, visibleLines) {
  let min = Infinity;
  let max = -Infinity;
  
  chartData.forEach(point => {
    Object.keys(point).forEach(key => {
      if (key === 'date') return;
      
      const commodity = key.split('-')[0];
      if (!visibleLines[commodity]) return;
      
      if (point[key] < min) min = point[key];
      if (point[key] > max) max = point[key];
    });
  });
  
  // Add some padding
  min = min === Infinity ? 0 : Math.floor(min * 0.9);
  max = max === -Infinity ? 10 : Math.ceil(max * 1.1);
  
  return [min, max];
}

// Main component
export default function CommodityPriceTracker() {
  // State for all commodities data
  const [commoditiesData, setCommoditiesData] = useState({
    milk: { loading: true, data: [], error: null, latestPrice: null, priceChange: null },
    eggs: { loading: true, data: [], error: null, latestPrice: null, priceChange: null }
  });
  
  const [visibleLines, setVisibleLines] = useState({
    milk: true,
    eggs: true
  });
  
  // Calculate the latest stats for each commodity
  const commodityStats = useMemo(() => {
    const stats = {};
    
    Object.keys(commoditiesData).forEach(commodity => {
      const data = commoditiesData[commodity]?.data || [];
      if (data.length >= 2) {
        const latest = data[data.length - 1];
        const previous = data[data.length - 2];
        stats[commodity] = {
          latestPrice: latest.price,
          priceChange: {
            amount: (latest.price - previous.price).toFixed(2),
            percentage: ((latest.price - previous.price) / previous.price * 100).toFixed(1)
          }
        };
      }
    });
    
    return stats;
  }, [commoditiesData]);

  // Prepare chart data with 2024 average and 2025 weekly prices
  const chartData = useMemo(() => {
    return prepareChartData(commoditiesData);
  }, [commoditiesData]);
  
  // Calculate Y-axis domain based on visible lines
  const yDomain = useMemo(() => {
    return getYDomain(chartData, visibleLines);
  }, [chartData, visibleLines]);
  
  // Available commodities (those with data)
  const availableCommodities = useMemo(() => {
    return Object.keys(commoditiesData).filter(commodity => 
      !commoditiesData[commodity].loading && 
      commoditiesData[commodity].data?.length > 0
    );
  }, [commoditiesData]);

  // Handle toggling line visibility
  const handleToggleLine = (commodity) => {
    setVisibleLines(prev => ({
      ...prev,
      [commodity]: !prev[commodity]
    }));
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
        
        const prices = result.data[commodity].prices.sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        
        processedData[commodity] = {
          loading: false,
          data: prices,
          error: null,
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

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Commodity Price Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Toggle controls for each commodity */}
            <div className="flex flex-wrap gap-3">
              {availableCommodities.map(commodity => (
                <button
                  key={commodity}
                  onClick={() => handleToggleLine(commodity)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                    ${visibleLines[commodity] 
                      ? 'bg-white shadow-md border border-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COMMODITY_CONFIG[commodity]?.color || '#333' }}
                  />
                  <span className={`font-medium text-sm
                    ${visibleLines[commodity] ? 'text-gray-900' : 'text-gray-600'}
                  `}>
                    {COMMODITY_CONFIG[commodity]?.name || commodity}
                  </span>
                </button>
              ))}
            </div>

            {/* Stats Cards for each visible commodity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCommodities.map(commodity => {
                if (!visibleLines[commodity] || !commodityStats[commodity]) return null;
                
                const stats = commodityStats[commodity];
                return (
                  <div 
                    key={commodity}
                    className="flex items-center gap-4 p-6 bg-gray-50 rounded-lg border"
                    style={{ borderLeftColor: COMMODITY_CONFIG[commodity]?.color || '#333', borderLeftWidth: '4px' }}
                  >
                    <div>
                      <p className="text-sm text-gray-500">{COMMODITY_CONFIG[commodity]?.name || commodity}</p>
                      <p className="text-3xl font-bold">${stats.latestPrice?.toFixed(2)}</p>
                    </div>
                    {stats.priceChange && (
                      <div className="flex items-center gap-3">
                        {parseFloat(stats.priceChange.amount) > 0 ? (
                          <TrendingUp className="text-red-500 h-6 w-6" />
                        ) : (
                          <TrendingDown className="text-green-500 h-6 w-6" />
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Weekly Change</p>
                          <p className={`text-lg font-semibold ${parseFloat(stats.priceChange.amount) > 0 ? "text-red-600" : "text-green-600"}`}>
                            ${Math.abs(stats.priceChange.amount)} ({Math.abs(stats.priceChange.percentage)}%)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Loading State */}
            {Object.values(commoditiesData).some(c => c.loading) && (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-e-transparent"></div>
                <p className="mt-4">Loading price data...</p>
              </div>
            )}
            
            {/* Error State */}
            {Object.values(commoditiesData).some(c => c.error) && (
              <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p>Error loading price data</p>
                <button 
                  onClick={fetchData}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Price Chart */}
            {availableCommodities.length > 0 && chartData.length > 0 && (
              <div className="bg-white p-4 rounded-lg border">
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <LineChart 
                      data={chartData} 
                      margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
                      connectNulls={true}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        domain={yDomain}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                        width={70}
                      />
                      <Tooltip content={(props) => <CustomTooltip {...props} visibleLines={visibleLines} />} />
                      <Legend />
                      <ReferenceLine x="2024 Avg" stroke="#666" strokeDasharray="3 3" />
                      
                      {/* Render a line for each commodity */}
                      {availableCommodities.map(commodity => (
                        <Line 
                          key={commodity}
                          type="monotone" 
                          dataKey={`${commodity}-price`}
                          name={COMMODITY_CONFIG[commodity]?.name || commodity}
                          stroke={COMMODITY_CONFIG[commodity]?.color || '#333'}
                          strokeWidth={2}
                          connectNulls={true}
                          activeDot={{ r: 6 }}
                          dot={{ r: 4 }}
                          hide={!visibleLines[commodity]} // Hide instead of conditionally rendering
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-center">
                  <p>2024 Avg represents the annual average price for 2024 | Subsequent points show weekly prices for 2025</p>
                </div>
              </div>
            )}

            {/* No Data State */}
            {!Object.values(commoditiesData).some(c => c.loading) && 
             !Object.values(commoditiesData).some(c => c.error) && 
             availableCommodities.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No price data available.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}