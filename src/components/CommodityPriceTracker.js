'use client';

import React, { useState, useEffect } from 'react';
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
          {entry.name}: ${Number(entry.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

/**
 * Individual commodity chart component
 */
function CommodityChart({ title, color, data, latest }) {
  if (!data || data.length === 0) return null;
  
  // Get min/max for Y axis
  const prices = data.map(item => item.price);
  const minPrice = Math.floor(Math.min(...prices) * 0.9);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.1);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          <span>{title}</span>
          <span className="text-xl font-bold">${latest.price.toFixed(2)}</span>
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
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <LineChart 
              data={data} 
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
  
  const latest = data[data.length - 1];
  
  // Get min/max for Y axis
  const prices = data.map(item => item.basketPrice);
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
        <div style={{ width: '100%', height: 500 }}>
          <ResponsiveContainer>
            <LineChart 
              data={data} 
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
              {/* {Object.keys(COMMODITY_CONFIG).map(commodity => (
                <Line
                  key={commodity}
                  type="monotone"
                  dataKey={`prices.${commodity}`}
                  name={COMMODITY_CONFIG[commodity].name}
                  stroke={COMMODITY_CONFIG[commodity].color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                />
              ))} */}
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

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

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
      
      setPriceData(result.data);
      setLoading(false);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError(err.message);
      setLoading(false);
    }
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
      
      {!loading && !error && priceData && (
        <>
          {/* Basket chart at the top */}
          <BasketChart 
            data={priceData.basket} 
            quantities={priceData.metadata.quantities}
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
            {Object.keys(priceData.charts).map(commodity => (
              <CommodityChart 
                key={commodity}
                title={COMMODITY_CONFIG[commodity]?.name || commodity}
                color={COMMODITY_CONFIG[commodity]?.color || '#333'}
                data={priceData.charts[commodity].data}
                latest={priceData.charts[commodity].latest}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}