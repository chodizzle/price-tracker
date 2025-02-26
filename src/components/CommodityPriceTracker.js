'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Commodity display names and colors
const COMMODITY_CONFIG = {
  milk: { 
    name: 'Milk (Gallon)',
    color: '#2563eb',      // blue-600
  },
  eggs: { 
    name: 'Eggs (Dozen)',
    color: '#d97706',      // amber-600
  }
};

/**
 * Custom tooltip for price charts
 */
const PriceTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  return (
    <div className="bg-white p-3 border rounded shadow-lg">
      <p className="font-semibold">{label}</p>
      {payload.map((entry, index) => (
        <p 
          key={index} 
          style={{ color: entry.color }}
          className="font-medium"
        >
          ${Number(entry.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

/**
 * Process data for each commodity with aligned dates
 */
function processData(commoditiesData) {
  const result = {};
  
  Object.keys(commoditiesData).forEach(commodity => {
    const data = commoditiesData[commodity]?.data || [];
    
    // Skip if no data
    if (data.length === 0) return;
    
    // Track aligned data and last seen prices
    const alignedData = [];
    let lastPrice = null;
    let lastDate = null;
    
    // Find 2024 baseline
    const baseline = commoditiesData[commodity]?.metadata?.baseline?.['2024']?.annualMean || null;
    
    // Add 2024 baseline as first point if available
    if (baseline) {
      alignedData.push({
        date: '2024 Avg',
        alignedDate: '2024 Avg',
        price: baseline,
        isEstimated: false
      });
      lastPrice = baseline;
    }
    
    // Process each price point
    data.forEach(point => {
      // Only include 2025 data
      if (!point.date.startsWith('2025')) return;
      
      // Use adjusted date if available, otherwise original date
      const alignedDate = point.adj_date || point.date;
      
      alignedData.push({
        date: point.date,
        alignedDate,
        price: point.price,
        isEstimated: false
      });
      
      lastPrice = point.price;
      lastDate = alignedDate;
    });
    
    // Sort by date
    alignedData.sort((a, b) => {
      if (a.alignedDate === '2024 Avg') return -1;
      if (b.alignedDate === '2024 Avg') return 1;
      return new Date(a.alignedDate) - new Date(b.alignedDate);
    });
    
    // Store processed data
    result[commodity] = {
      data: alignedData,
      baseline,
      latestPrice: lastPrice,
      latestDate: lastDate
    };
  });
  
  return result;
}

/**
 * Get min and max values for Y-axis
 */
function getYDomain(data) {
  if (!data || data.length === 0) return [0, 10];
  
  let min = Math.min(...data.map(item => item.price));
  let max = Math.max(...data.map(item => item.price));
  
  // Add some padding
  min = Math.floor(min * 0.9);
  max = Math.ceil(max * 1.1);
  
  return [min, max];
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (dateStr === '2024 Avg') return dateStr;
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate price change stats
 */
function calculatePriceChange(data) {
  if (!data || data.length < 2) return null;
  
  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  
  const amount = latest.price - previous.price;
  const percentage = (amount / previous.price) * 100;
  
  return {
    amount: amount.toFixed(2),
    percentage: percentage.toFixed(1),
    isIncrease: amount > 0
  };
}

/**
 * Individual commodity chart component
 */
function CommodityChart({ title, color, data, baseline }) {
  if (!data || data.length === 0) return null;
  
  const yDomain = getYDomain(data);
  const priceChange = calculatePriceChange(data);
  const latestPrice = data[data.length - 1]?.price;
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          <span>{title}</span>
          <span className="text-xl font-bold">${latestPrice.toFixed(2)}</span>
        </CardTitle>
        {priceChange && (
          <div className="flex items-center text-sm">
            {priceChange.isIncrease ? (
              <TrendingUp className="text-red-500 h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="text-green-500 h-4 w-4 mr-1" />
            )}
            <span className={priceChange.isIncrease ? "text-red-600" : "text-green-600"}>
              ${Math.abs(priceChange.amount)} ({Math.abs(priceChange.percentage)}%)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <LineChart 
              data={data} 
              margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="alignedDate"
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                domain={yDomain}
                tickFormatter={(value) => `$${value}`}
                width={45}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={PriceTooltip} />
              <ReferenceLine x="2024 Avg" stroke="#666" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="price"
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
 * Main component: Small multiples view of commodity prices
 */
export default function CommodityPriceTracker() {
  const [commoditiesData, setCommoditiesData] = useState({
    milk: { loading: true, data: [], error: null },
    eggs: { loading: true, data: [], error: null }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Process raw data to align dates and prepare for display
  const processedData = useMemo(() => {
    if (loading) return {};
    return processData(commoditiesData);
  }, [commoditiesData, loading]);

  // Fetch price data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      
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
        
        processedData[commodity] = {
          loading: false,
          data: result.data[commodity].prices.sort((a, b) => new Date(a.date) - new Date(b.date)),
          error: null,
          metadata: result.data[commodity].metadata
        };
      });
      
      setCommoditiesData(processedData);
      setLoading(false);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Commodity Price Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-e-transparent"></div>
              <p className="mt-4">Loading price data...</p>
            </div>
          )}
          
          {error && (
            <div className="text-red-600 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p>Error loading price data: {error}</p>
              <button 
                onClick={fetchData}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}
          
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(processedData).map(commodity => (
                <CommodityChart 
                  key={commodity}
                  title={COMMODITY_CONFIG[commodity]?.name || commodity}
                  color={COMMODITY_CONFIG[commodity]?.color || '#333'}
                  data={processedData[commodity]?.data || []}
                  baseline={processedData[commodity]?.baseline}
                />
              ))}
            </div>
          )}
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>&quot;2024 Avg&quot; represents the annual average price for 2024.</p>
            <p className="mt-1">Prices are aligned to Fridays for consistent comparison.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}