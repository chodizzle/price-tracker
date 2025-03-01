'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [secretKey, setSecretKey] = useState('');
  const [message, setMessage] = useState('');
  const [kvTestResult, setKvTestResult] = useState(null);
  
  // Fetch status on load
  useEffect(() => {
    fetchStatus();
  }, []);
  
  // Fetch status from API
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Test KV connection directly
  const testKvConnection = async () => {
    try {
      setLoading(true);
      setMessage('Testing direct KV connection...');
      
      const response = await fetch('/api/diagnostic/kv');
      const data = await response.json();
      
      setKvTestResult(data);
      
      if (data.kvTest.connected) {
        setMessage('KV connection test successful! 🎉');
      } else {
        setMessage(`KV connection test failed: ${data.kvTest.error}`);
      }
    } catch (error) {
      console.error('Error testing KV connection:', error);
      setMessage(`Error: ${error.message}`);
      setKvTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  // Trigger data initialization
  const initializeData = async () => {
    if (!secretKey) {
      setMessage('Please enter the admin secret key');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('Initializing data... This may take a few minutes.');
      
      const response = await fetch('/api/cron/update-prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });
      
      const result = await response.json();
      setResult(result);
      
      if (result.success) {
        setMessage('Data initialization successful!');
        // Refresh status after initialization
        await fetchStatus();
      } else {
        setMessage(`Initialization failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>System Status</span>
              <div className="flex gap-2">
                <button 
                  onClick={testKvConnection}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded-md"
                >
                  Test KV
                </button>
                <button 
                  onClick={fetchStatus}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md"
                >
                  Refresh
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading status...</p>}
            {status && (
              <div className="text-sm">
                <div className="mb-3">
                  <span className="font-semibold">Redis Status:</span>
                  <span className={`ml-2 ${status.redis.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.redis.status}
                  </span>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">Data Status:</span>
                  <ul className="ml-4 list-disc">
                    <li>price_data: {status.data.hasPriceData ? '✅' : '❌'}</li>
                    <li>combined_price_data: {status.data.hasCombinedData ? '✅' : '❌'}</li>
                  </ul>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">Environment:</span>
                  <ul className="ml-4 list-disc">
                    <li>KV_URL configured: {status.environment.kv_url_configured ? '✅' : '❌'}</li>
                    <li>KV_REST_API configured: {status.environment.kv_rest_api_configured ? '✅' : '❌'}</li>
                    <li>USDA_API_KEY configured: {status.environment.usda_api_key_configured ? '✅' : '❌'}</li>
                    <li>EIA_API_KEY configured: {status.environment.eia_api_key_configured ? '✅' : '❌'}</li>
                    <li>CRON_SECRET configured: {status.environment.cron_secret_configured ? '✅' : '❌'}</li>
                    <li>ADMIN_SECRET_KEY configured: {status.environment.admin_secret_key_configured ? '✅' : '❌'}</li>
                  </ul>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">KV Connection Details:</span>
                  <ul className="ml-4 list-disc">
                    <li>Status: {status.redis.status}</li>
                    <li>Initialized: {status.redis.connectionDetails?.initialized ? '✅' : '❌'}</li>
                    <li>Connected: {status.redis.connectionDetails?.connected ? '✅' : '❌'}</li>
                    {status.redis.connectionDetails?.lastError && (
                      <li className="text-red-600">
                        Last Error: {status.redis.connectionDetails.lastError.message}
                        <br/>
                        <span className="text-xs">{status.redis.connectionDetails.lastError.timestamp}</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                {status.redis.keyList && status.redis.keyList.length > 0 && (
                  <div className="mb-3">
                    <span className="font-semibold">Redis Keys:</span>
                    <ul className="ml-4 list-disc">
                      {status.redis.keyList.map((key, index) => (
                        <li key={index}>{key}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Initialization Card */}
        <Card>
          <CardHeader>
            <CardTitle>Initialize Price Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Admin Secret Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="border rounded w-full px-3 py-2"
                placeholder="Enter admin secret key"
              />
            </div>
            
            <button
              onClick={initializeData}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Initialize Data'}
            </button>
            
            {message && (
              <div className={`mt-4 p-3 rounded ${result?.success ? 'bg-green-100' : 'bg-red-100'}`}>
                {message}
              </div>
            )}
            
            {result && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
            
            {kvTestResult && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <h4 className="font-medium mb-2">KV Test Result:</h4>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(kvTestResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}