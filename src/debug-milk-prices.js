// src/debug-milk-prices.js
const fs = require('fs');
const path = require('path');

// Paths
const RAW_DATA_PATH = path.join(process.cwd(), 'data', 'raw', 'milk_prices_raw.json');
const PRICES_FILE = path.join(process.cwd(), 'data', 'prices.json');

async function debugMilkPrices() {
    console.log('Starting milk price debug...');
    
    // 1. Check if raw data exists
    console.log('\nChecking raw data file...');
    if (!fs.existsSync(RAW_DATA_PATH)) {
        console.error('Raw milk price data not found at:', RAW_DATA_PATH);
        return;
    }
    
    // 2. Read and parse raw data
    console.log('\nReading raw milk price data...');
    const rawData = JSON.parse(fs.readFileSync(RAW_DATA_PATH, 'utf8'));
    console.log('Found', rawData.results.length, 'raw records');
    
    // 3. Filter and transform data
    console.log('\nFiltering and transforming data...');
    const filteredPrices = rawData.results
        .filter(item => 
            item.region === 'National' && 
            item.organic === 'No' && 
            item.package === 'Gallon'
        )
        .map(item => ({
            date: new Date(item.report_begin_date).toISOString().split('T')[0],
            price: parseFloat(item.wtd_avg_price || item.avg_price),
            minPrice: parseFloat(item.price_min || item.price_low || item.wtd_avg_price),
            maxPrice: parseFloat(item.price_max || item.price_high || item.wtd_avg_price),
            storeCount: parseInt(item.store_count || 0)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    console.log('Processed', filteredPrices.length, 'records');
    console.log('Sample price record:', filteredPrices[0]);
    
    // 4. Read current prices.json
    console.log('\nReading current prices.json...');
    const pricesData = fs.existsSync(PRICES_FILE) 
        ? JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'))
        : { eggs: { prices: [] }, milk: { prices: [] } };
    
    console.log('Current data structure:', Object.keys(pricesData));
    console.log('Current milk prices count:', pricesData.milk?.prices?.length || 0);
    
    // 5. Update milk prices
    if (!pricesData.milk) {
        pricesData.milk = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                dataSource: { 2025: 'usda-api' }
            },
            prices: []
        };
    }
    
    // Get existing dates to avoid duplicates
    const existingDates = new Set(pricesData.milk.prices.map(p => p.date));
    const newPrices = filteredPrices.filter(p => !existingDates.has(p.date));
    
    pricesData.milk.prices = [
        ...pricesData.milk.prices,
        ...newPrices
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    pricesData.milk.metadata.lastUpdated = new Date().toISOString();
    
    // 6. Save updated data
    console.log('\nSaving updated prices.json...');
    fs.writeFileSync(PRICES_FILE, JSON.stringify(pricesData, null, 2));
    
    console.log('Final milk prices count:', pricesData.milk.prices.length);
    console.log('Debug complete!');
}

debugMilkPrices().catch(console.error);