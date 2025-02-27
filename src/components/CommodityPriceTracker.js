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
}

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
}

/**
 * Main component: Small multiples view of commodity prices
 */
function CommodityPriceTracker() {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {priceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(COMMODITY_CONFIG).map(commodity => (
            <CommodityChart
              key={commodity}
              title={COMMODITY_CONFIG[commodity].name}
              color={COMMODITY_CONFIG[commodity].color}
              data={priceData[commodity]}
              latest={priceData[commodity][priceData[commodity].length - 1]}
            />
          ))}
          <BasketChart data={priceData.basket} weights={priceData.weights} />
        </div>
      )}
    </div>
  );
}

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
                tickFormatter={(value) => `$${value}`}
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
function BasketChart({ data, weights }) {
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
              ({Object.entries(weights).map(([name, qty], index) => 
                `${index > 0 ? ', ' : ''}${qty} ${COMMODITY_CONFIG[name]?.name?.toLowerCase() || name}`
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
        <div style={{ width: '100%', height: 250 }}>
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
                tickFormatter={(value) => `$${value}`}
                width={45}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={PriceTooltip} />
              <ReferenceLine x="2024 Avg" stroke="#666" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="basketPrice"
                name="Basket Total"
                stroke="#8884d8"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
              />
              {Object.keys(COMMODITY_CONFIG).map(commodity => (
                <Line
                  key={commodity}
                  type="monotone"
                  dataKey={`prices.${commodity}`}
                  name={COMMODITY_CONFIG[commodity].name}
                  stroke={COMMODITY_CONFIG[commodity].color}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  connectNulls={true}
                />
              ))}
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
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

// Fetch price data from API
const fetchData = async () => {
  try {
    setLoading(true);
    
    const response = await fetch('/api/combined-prices');
    
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