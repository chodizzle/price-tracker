// src/app/api/cron/update-prices/route.js
import { NextResponse } from 'next/server';
import storage from '@/lib/storage';

// Enhanced version for more reliable initialization
export async function POST(request) {
  console.log('Update prices endpoint called');
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET;
    const adminKey = process.env.ADMIN_SECRET_KEY;
    
    if (!secretKey && !adminKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Neither CRON_SECRET nor ADMIN_SECRET_KEY configured in environment' 
      }, { status: 500 });
    }
    
    // Check if authorized with either secret
    const isAuthorized = 
      (secretKey && authHeader === `Bearer ${secretKey}`) || 
      (adminKey && authHeader === `Bearer ${adminKey}`);
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access' 
      }, { status: 401 });
    }
    
    console.log('Starting manual price data initialization...');
    
    // Check storage connection
    try {
      const pingResult = await storage.ping();
      if (!pingResult) {
        return NextResponse.json({
          success: false,
          error: 'Redis connection failed'
        }, { status: 500 });
      }
      console.log('Storage connection verified');
    } catch (error) {
      console.error('Storage error:', error);
      return NextResponse.json({
        success: false,
        error: `Storage error: ${error.message}`
      }, { status: 500 });
    }
    
    // Import initialization functions dynamically
    try {
      console.log('Importing initialization modules...');
      
      // Import in a more explicit and careful way
      const scriptsBasePath = process.cwd() + '/src/scripts';
      console.log('Scripts base path:', scriptsBasePath);
      
      // Import and extract functions one by one with better error handling
      console.log('Importing egg prices module...');
      const { initializeEggPrices } = await import('@/scripts/init-egg-prices.js')
        .catch(err => {
          console.error('Error importing egg prices module:', err);
          throw new Error(`Failed to import egg prices module: ${err.message}`);
        });
        
      console.log('Importing milk prices module...');
      const { initializeMilkPrices } = await import('@/scripts/init-milk-prices.js')
        .catch(err => {
          console.error('Error importing milk prices module:', err);
          throw new Error(`Failed to import milk prices module: ${err.message}`);
        });
        
      console.log('Importing gasoline prices module...');  
      const { initializeGasolinePrices } = await import('@/scripts/init-gasoline-prices.js')
        .catch(err => {
          console.error('Error importing gasoline prices module:', err);
          throw new Error(`Failed to import gasoline prices module: ${err.message}`);
        });
        
      console.log('Importing process prices module...');
      const { processPrices } = await import('@/scripts/process-prices.js')
        .catch(err => {
          console.error('Error importing process prices module:', err);
          throw new Error(`Failed to import process prices module: ${err.message}`);
        });
      
      // Initialize data
      console.log('Initializing egg prices...');
      const eggResult = await initializeEggPrices();
      console.log(`Processed ${eggResult?.prices?.length || 0} egg prices`);
      
      console.log('Initializing milk prices...');
      const milkResult = await initializeMilkPrices();  
      console.log(`Processed ${milkResult?.prices?.length || 0} milk prices`);
      
      console.log('Initializing gasoline prices...');
      const gasolineResult = await initializeGasolinePrices();
      console.log(`Processed ${gasolineResult?.prices?.length || 0} gasoline prices`);
      
      // Process the combined data
      console.log('Processing combined price data...');
      const processedData = await processPrices();
      
      console.log('Data initialization complete!');
      
      return NextResponse.json({
        success: true,
        message: 'Price data initialized successfully',
        timestamp: new Date().toISOString(),
        stats: {
          egg_prices: eggResult?.prices?.length || 0,
          milk_prices: milkResult?.prices?.length || 0,
          gasoline_prices: gasolineResult?.prices?.length || 0,
          basket_points: processedData?.basket?.length || 0
        }
      });
    } catch (error) {
      console.error('Error during initialization:', error);
      return NextResponse.json({
        success: false,
        error: `Initialization error: ${error.message}`,
        stack: error.stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unhandled error in update prices:', error);
    
    // Handle circular references in error objects
    const safeError = {
      message: error.message || 'Unknown error',
      name: error.name,
      stack: error.stack
    };
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update price data',
      error: safeError.message,
      errorDetails: safeError
    }, { status: 500 });
  }
}

// For Vercel Cron and GET requests
export async function GET(request) {
  return POST(request);
}