// src/app/api/diagnostic/direct-kv/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

/**
 * More detailed KV connection test with better error handling and URL conversion
 */
export async function GET() {
  try {
    // Get all possible KV/Redis connection info (hide actual values)
    const connectionInfo = {
      KV_URL: process.env.KV_URL ? `${process.env.KV_URL.substring(0, 10)}...` : "Not set",
      KV_REST_API_URL: process.env.KV_REST_API_URL ? `${process.env.KV_REST_API_URL.substring(0, 10)}...` : "Not set",
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? "Set (hidden)" : "Not set",
      REDIS_URL: process.env.REDIS_URL ? `${process.env.REDIS_URL.substring(0, 10)}...` : "Not set",
    };
    
    // Extract URL types
    const urlTypes = {
      KV_URL_type: process.env.KV_URL?.startsWith('https') ? 'HTTPS' :
                   process.env.KV_URL?.startsWith('redis') ? 'Redis' : 'Unknown',
      KV_REST_API_URL_type: process.env.KV_REST_API_URL?.startsWith('https') ? 'HTTPS' : 'Unknown'
    };
    
    // Test results
    const tests = [];
    
    // Test 1: Try direct HTTPS connection if we have REST API URL
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        tests.push({ name: "REST API Direct Test", status: "running" });
        const index = tests.length - 1;
        
        // Create client with REST API
        const client = createClient({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN
        });
        
        // Try a simple operation
        const testKey = `__test_${Date.now()}`;
        await client.set(testKey, 'test-value');
        const result = await client.get(testKey);
        await client.del(testKey);
        
        tests[index].status = "success";
        tests[index].result = result === 'test-value' ? "Correct value returned" : "Unexpected value returned";
      } catch (error) {
        const lastTest = tests[tests.length - 1];
        lastTest.status = "error";
        lastTest.error = error.message;
      }
    }
    
    // Test 2: Try to convert Redis URL to REST format if needed
    if (process.env.KV_URL && process.env.KV_URL.startsWith('redis')) {
      try {
        tests.push({ name: "Redis URL Conversion Test", status: "running" });
        const index = tests.length - 1;
        
        // Parse Redis URL to extract host and password
        const match = process.env.KV_URL.match(/rediss?:\/\/default:([^@]+)@([^:]+):(\d+)/);
        
        if (match) {
          const [, password, host, port] = match;
          // Construct REST URL
          const restUrl = `https://${host}/redis/${password}`;
          
          // Try with converted URL
          const client = createClient({
            url: restUrl
          });
          
          // Try a simple operation
          const testKey = `__test_${Date.now()}`;
          await client.set(testKey, 'conversion-test');
          const result = await client.get(testKey);
          await client.del(testKey);
          
          tests[index].status = "success";
          tests[index].result = result === 'conversion-test' ? "Conversion successful" : "Unexpected value returned";
          tests[index].convertedUrl = `https://${host}/redis/***`; // Hide password
        } else {
          tests[index].status = "error";
          tests[index].error = "Could not parse Redis URL format";
        }
      } catch (error) {
        const lastTest = tests[tests.length - 1];
        lastTest.status = "error";
        lastTest.error = error.message;
      }
    }
    
    // Test 3: Try direct KV_URL if it's HTTPS
    if (process.env.KV_URL && process.env.KV_URL.startsWith('https')) {
      try {
        tests.push({ name: "Direct HTTPS KV_URL Test", status: "running" });
        const index = tests.length - 1;
        
        // Create client with KV_URL
        const client = createClient({
          url: process.env.KV_URL
        });
        
        // Try a simple operation
        const testKey = `__test_${Date.now()}`;
        await client.set(testKey, 'https-test');
        const result = await client.get(testKey);
        await client.del(testKey);
        
        tests[index].status = "success";
        tests[index].result = result === 'https-test' ? "Correct value returned" : "Unexpected value returned";
      } catch (error) {
        const lastTest = tests[tests.length - 1];
        lastTest.status = "error";
        lastTest.error = error.message;
      }
    }
    
    // Summary and recommendations
    let recommendation = "";
    const successfulTests = tests.filter(test => test.status === "success");
    
    if (successfulTests.length > 0) {
      recommendation = `At least one connection method worked! Use the configuration from the successful test: ${successfulTests[0].name}`;
      
      if (successfulTests[0].name === "Redis URL Conversion Test") {
        recommendation += ". Consider setting KV_REST_API_URL to the converted URL format shown in the test results.";
      }
    } else if (tests.length > 0) {
      recommendation = "All connection tests failed. Check your Redis/KV configuration in Vercel.";
      
      // Specific recommendations based on errors
      const errorMessages = tests.map(t => t.error || "").join(" ");
      
      if (errorMessages.includes("invalid URL") || errorMessages.includes("URL format")) {
        recommendation += " The URL format appears to be incorrect. For Vercel KV, use HTTPS URLs.";
      }
      
      if (errorMessages.includes("unauthorized") || errorMessages.includes("authentication")) {
        recommendation += " There seems to be an authentication issue with your token.";
      }
    } else {
      recommendation = "No connection tests were performed. Check that at least one of KV_URL or KV_REST_API_URL is set.";
    }
    
    // Return comprehensive diagnostic info
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        connection_info: connectionInfo,
        url_types: urlTypes
      },
      tests,
      recommendation
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}