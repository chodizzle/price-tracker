import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Utility function to format dates
const formatMonthDay = (dateString) => {
  if (dateString === '2024 Avg') return dateString;
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Function to get the month from a date string
const getMonth = (dateString) => {
  if (dateString === '2024 Avg') return 0;
  
  const date = new Date(dateString);
  return date.getMonth();
};

// Function to get the year from a date string
const getYear = (dateString) => {
  if (dateString === '2024 Avg') return 2024;
  
  const date = new Date(dateString);
  return date.getFullYear();
};

/**
 * Custom tooltip for basket chart
 */
const BasketTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  
  const dataPoint = payload[0].payload;
  
  return (
    <div className="bg-white p-3 border rounded shadow-lg">
      <p className="font-semibold">{dataPoint.displayDate || label}</p>
      {payload.map((entry, index) => {
        if (!entry.value) return null;
        
        return (
          <p 
            key={index} 
            style={{ color: entry.color }}
            className="font-medium"
          >
            {entry.name}: ${Number(entry.value).toFixed(2)}
          </p>
        );
      })}
      
      {dataPoint.priceDetails && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-sm text-gray-600 font-medium">Basket Contents:</p>
          {Object.entries(dataPoint.priceDetails).map(([commodity, price], idx) => (
            <p key={idx} className="text-sm">
              {commodity}: ${price.toFixed(2)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

const YearlyBasketChart = ({ data, commodityInfo, latest, baseline }) => {
  const [groupedData, setGroupedData] = useState([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!data || data.length === 0) {
      setHasData(false);
      return;
    }

    // Group data by month (0-11)
    const monthlyData = Array(12).fill().map((_, i) => ({
      month: i,
      displayMonth: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' })
    }));

    // Add each year's data to the monthly groups
    data.forEach(item => {
      if (item.date === '2024 Avg') return; // Skip the average
      
      const year = getYear(item.date);
      const month = getMonth(item.date);
      
      // Add the data point to the right month
      if (monthlyData[month]) {
        monthlyData[month][`basket${year}`] = item.basketPrice;
        monthlyData[month][`displayDate${year}`] = formatMonthDay(item.date) + ', ' + year;
        
        // Save the detailed prices for the tooltip
        if (item.prices) {
          monthlyData[month][`priceDetails${year}`] = item.prices;
        }
      }
    });

    setGroupedData(monthlyData.filter(m => m.basket2024 || m.basket2025));
    setHasData(true);
  }, [data]);

  if (!hasData) {
    return (
      <Card className="h-full mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Basket of Goods</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-center py-8 text-gray-500">
            No valid basket data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get commodities description
  const getCommoditiesDescription = () => {
    if (!commodityInfo) return null;
    
    return Object.entries(commodityInfo)
      .map(([name, info]) => `${info.name || name}`)
      .join(' + ');
  };

  // Price change indicators
  const getLatestPriceIndicator = () => {
    if (!latest || !latest.change) return null;
    
    return (
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
    );
  };

  // VS Baseline comparison
  const getBaselineComparison = () => {
    if (!baseline || !latest) return null;
    
    const baselineValue = baseline.basketPrice;
    const currentValue = latest.basketPrice;
    const diff = currentValue - baselineValue;
    const percentChange = (diff / baselineValue) * 100;
    
    return (
      <div className="text-sm font-medium mt-1">
        vs 2024 average: 
        <span className={diff > 0 ? " text-red-600" : " text-green-600"}>
          {diff > 0 ? " +" : " "}${Math.abs(diff).toFixed(2)} ({Math.abs(percentChange).toFixed(1)}%)
        </span>
      </div>
    );
  };

  return (
    <Card className="h-full mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Basket of Goods</span>
          <span className="text-2xl font-bold">${latest?.basketPrice.toFixed(2)}</span>
        </CardTitle>
        <CardDescription>{getCommoditiesDescription()}</CardDescription>
        {getLatestPriceIndicator()}
        {getBaselineComparison()}
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart 
              data={groupedData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayMonth"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                width={50}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={BasketTooltip} />
              <Legend />
              
              {/* 2024 Line */}
              <Line 
                type="monotone" 
                dataKey="basket2024"
                name="2024"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
              
              {/* 2025 Line */}
              <Line 
                type="monotone" 
                dataKey="basket2025"
                name="2025"
                stroke="#8884d8"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default YearlyBasketChart;