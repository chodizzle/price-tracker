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
  const [directKvTestResult, setDirectKvTestResult] = useState(null);
  const [migrateResult, setMigrateResult] = useState(null);
  const [directInitResult, setDirectInitResult] = useState(null);
  
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
      
      if (data.kvTest?.connected) {
        setMessage('KV connection test successful! 🎉');
      } else {
        setMessage(`KV connection test failed: ${data.kvTest?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing KV connection:', error);
      setMessage(`Error: ${error.message}`);
      setKvTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  // Advanced direct KV connection test
  const testDirectKvConnection = async () => {
    try {
      setLoading(true);
      setMessage('Running advanced KV diagnostic tests...');
      
      const response = await fetch('/api/diagnostic/direct-kv');
      const data = await response.json();
      
      setDirectKvTestResult(data);
      
      const successfulTests = data.tests?.filter(test => test.status === "success") || [];
      if (successfulTests.length > 0) {
        setMessage(`Found a working KV connection method! 🎉 ${data.recommendation || ''}`);
      } else {
        setMessage(`All KV connection tests failed. ${data.recommendation || ''}`);
      }
    } catch (error) {
      console.error('Error running advanced KV diagnostic:', error);
      setMessage(`Error: ${error.message}`);
      setDirectKvTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  // Initialize database structure directly using migration endpoint
  const migrateDatabase = async () => {
    if (!secretKey) {
      setMessage('Please enter the admin secret key');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('Setting up initial database structure...');
      
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Uses default connection options
      });
      
      const data = await response.json();
      setMigrateResult(data);
      
      if (data.success) {
        setMessage('Database structure initialized successfully! Now try initializing price data.');
        // Refresh status to show the data is now present
        await fetchStatus();
      } else {
        setMessage(`Database migration failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error migrating database:', error);
      setMessage(`Error: ${error.message}`);
      setMigrateResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  // Direct initialization with static data
  const directInitialize = async () => {
    if (!secretKey) {
      setMessage('Please enter the admin secret key');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('Directly initializing database with static data...');
      
      const response = await fetch('/api/admin/direct-init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Failed to parse response: ${e.message}. Status: ${response.status}`);
      }
      
      setDirectInitResult(data);
      
      if (data.success) {
        setMessage('Database successfully initialized with static data! The app should now work with baseline data.');
        // Refresh status to show the data is now present
        await fetchStatus();
      } else {
        setMessage(`Direct initialization failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in direct initialization:', error);
      setMessage(`Error: ${error.message}`);
      setDirectInitResult({ error: error.message });
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
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        setMessage('Data initialization successful!');
        // Refresh status after initialization
        await fetchStatus();
      } else {
        setMessage(`Initialization failed: ${data.error || 'Unknown error'}`);
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
                  onClick={testDirectKvConnection}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-purple-500 text-white rounded-md"
                >
                  Advanced KV Test
                </button>
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
                  <span className={`ml-2 ${status.redis?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.redis?.status || 'unknown'}
                  </span>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">Data Status:</span>
                  <ul className="ml-4 list-disc">
                    <li>price_data: {status.data?.hasPriceData ? '✅' : '❌'}</li>
                    <li>combined_price_data: {status.data?.hasCombinedData ? '✅' : '❌'}</li>
                  </ul>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">Environment:</span>
                  <ul className="ml-4 list-disc">
                    <li>KV_URL configured: {status.environment?.kv_url_configured ? '✅' : '❌'}</li>
                    <li>KV_REST_API configured: {status.environment?.kv_rest_api_configured ? '✅' : '❌'}</li>
                    <li>USDA_API_KEY configured: {status.environment?.usda_api_key_configured ? '✅' : '❌'}</li>
                    <li>EIA_API_KEY configured: {status.environment?.eia_api_key_configured ? '✅' : '❌'}</li>
                    <li>CRON_SECRET configured: {status.environment?.cron_secret_configured ? '✅' : '❌'}</li>
                    <li>ADMIN_SECRET_KEY configured: {status.environment?.admin_secret_key_configured ? '✅' : '❌'}</li>
                  </ul>
                </div>
                
                <div className="mb-3">
                  <span className="font-semibold">KV Connection Details:</span>
                  <ul className="ml-4 list-disc">
                    <li>Status: {status.redis?.status || 'unknown'}</li>
                    <li>Initialized: {status.redis?.connectionDetails?.initialized ? '✅' : '❌'}</li>
                    <li>Connected: {status.redis?.connectionDetails?.connected ? '✅' : '❌'}</li>
                    {status.redis?.connectionDetails?.lastError && (
                      <li className="text-red-600">
                        Last Error: {status.redis.connectionDetails.lastError.message}
                        <br/>
                        <span className="text-xs">{status.redis.connectionDetails.lastError.timestamp}</span>
                      </li>
                    )}
                  </ul>
                </div>
                
                {status.redis?.keyList && status.redis.keyList.length > 0 && (
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
            
            <div className="flex flex-col gap-2">
              <button
                onClick={directInitialize}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
                title="Initialize database with static baseline data - fastest and most reliable"
              >
                {loading ? 'Processing...' : 'Initialize with Static Data (Recommended)'}
              </button>
              
              <div className="flex flex-col gap-2 p-2 border border-gray-200 rounded mt-4">
                <h4 className="text-sm font-medium text-center mb-1">Advanced Options</h4>
                <button
                  onClick={migrateDatabase}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700 disabled:bg-gray-400 text-sm"
                  title="Set up empty database structure without loading price data"
                >
                  {loading ? 'Processing...' : 'Initialize Empty Database Structure'}
                </button>
              
                <button
                  onClick={initializeData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                  title="Fetch price data from USDA and EIA APIs (may be slow)"
                >
                  {loading ? 'Processing...' : 'Initialize with Live API Data'}
                </button>
              </div>
            </div>
            
            {message && (
              <div className={`mt-4 p-3 rounded ${result?.success || directInitResult?.success || migrateResult?.success ? 'bg-green-100' : 'bg-red-100'}`}>
                {message}
              </div>
            )}
            
            {directInitResult && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <h4 className="font-medium mb-2">Static Data Initialization Result:</h4>
                <div className={`mb-3 p-2 ${directInitResult.success ? 'bg-green-50' : 'bg-red-50'} rounded`}>
                  <p className={directInitResult.success ? 'text-green-600' : 'text-red-600'}>
                    {directInitResult.success ? 'Success! Database initialized with static data.' : 'Direct initialization failed.'}
                  </p>
                  {directInitResult.message && <p className="text-sm mt-1">{directInitResult.message}</p>}
                  {directInitResult.error && <p className="text-sm text-red-600 mt-1">{directInitResult.error}</p>}
                </div>
                <div className="text-xs overflow-auto whitespace-pre-wrap">
                  <pre>{JSON.stringify(directInitResult, null, 2)}</pre>
                </div>
              </div>
            )}
            
            {migrateResult && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <h4 className="font-medium mb-2">Database Migration Result:</h4>
                <div className={`mb-3 p-2 ${migrateResult.success ? 'bg-green-50' : 'bg-red-50'} rounded`}>
                  <p className={migrateResult.success ? 'text-green-600' : 'text-red-600'}>
                    {migrateResult.success ? 'Success! Database structure initialized.' : 'Migration failed.'}
                  </p>
                  {migrateResult.message && <p className="text-sm mt-1">{migrateResult.message}</p>}
                  {migrateResult.error && <p className="text-sm text-red-600 mt-1">{migrateResult.error}</p>}
                </div>
                <div className="text-xs overflow-auto whitespace-pre-wrap">
                  <pre>{JSON.stringify(migrateResult, null, 2)}</pre>
                </div>
              </div>
            )}
            
            {result && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <h4 className="font-medium mb-2">API Data Initialization Result:</h4>
                <div className={`mb-3 p-2 ${result.success ? 'bg-green-50' : 'bg-red-50'} rounded`}>
                  <p className={result.success ? 'text-green-600' : 'text-red-600'}>
                    {result.success ? 'Success! API data initialized.' : 'API data initialization failed.'}
                  </p>
                  {result.message && <p className="text-sm mt-1">{result.message}</p>}
                  {result.error && <p className="text-sm text-red-600 mt-1">{result.error}</p>}
                </div>
                <div className="text-xs overflow-auto whitespace-pre-wrap">
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            )}
            
            {directKvTestResult && (
              <div className="mt-4 border rounded p-3 bg-gray-50">
                <h4 className="font-medium mb-2">Advanced KV Test Results:</h4>
                {directKvTestResult.tests && (
                  <div className="mb-3">
                    <h5 className="font-medium">Test Results:</h5>
                    <ul className="list-disc ml-4">
                      {directKvTestResult.tests.map((test, index) => (
                        <li key={index} className={test.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                          {test.name}: {test.status}
                          {test.result && <div className="text-sm">{test.result}</div>}
                          {test.error && <div className="text-sm text-red-500">{test.error}</div>}
                          {test.convertedUrl && <div className="text-sm font-mono break-all">{test.convertedUrl}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {directKvTestResult.recommendation && (
                  <div className="mb-3 p-2 bg-blue-50 rounded">
                    <h5 className="font-medium">Recommendation:</h5>
                    <p>{directKvTestResult.recommendation}</p>
                  </div>
                )}
                <div className="text-xs overflow-auto whitespace-pre-wrap">
                  <pre>{JSON.stringify(directKvTestResult, null, 2)}</pre>
                </div>
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