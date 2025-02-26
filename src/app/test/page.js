'use client';

import { useState } from 'react';
import { fetchGroceryPrices, formatDate } from '../../services/priceAPIs';

export default function TestPage() {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);

    const endDate = new Date();
    // Subtract 7 days as buffer for data availability
    endDate.setDate(endDate.getDate() - 7);
    
    const startDate = new Date('2024-10-01');
    
    try {
      const result = await fetchGroceryPrices('Milk', formatDate(startDate), formatDate(endDate));
      console.log('API Response:', result);
      
      if (result.success) {
        setPriceData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4" lang="en">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <button 
        onClick={testAPI}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Test Milk Prices API'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {priceData && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Response Data:</h2>
          <pre className="bg-gray-800 text-gray-300 p-4 rounded overflow-auto font-mono text-sm shadow-inner">
            {JSON.stringify(priceData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}