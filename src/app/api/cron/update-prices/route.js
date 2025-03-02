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
    
    // Use static data initialization as a safer alternative
    try {
      console.log('Using static data initialization (more reliable)...');
      
      // Initialize with static price data
      const initialPriceData = {
        eggs: {
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: {
              2024: 'static-file',
              2025: 'usda-api'
            },
            baseline: {
              2024: {
                annualMean: 3.15,
                min: 1.55,
                max: 6.57
              }
            }
          },
          prices: [
            {
              date: '2024 Avg',
              price: 3.15,
              minPrice: 3.15, 
              maxPrice: 3.15,
              adj_date: '2024 Avg'
            }
          ]
        },
        milk: {
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: {
              2024: 'usda-api',
              2025: 'usda-api'
            },
            baseline: {
              2024: {
                annualMean: 3.41,
                min: 3.05,
                max: 3.99
              }
            }
          },
          prices: [
            {
              date: '2024 Avg',
              price: 3.41,
              minPrice: 3.41,
              maxPrice: 3.41,
              adj_date: '2024 Avg'
            }
          ]
        },
        gasoline_regular: {
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: {
              2024: 'eia-api',
              2025: 'eia-api'
            },
            name: 'Regular Gasoline (Gallon)',
            seriesId: 'PET.EMM_EPMR_PTE_NUS_DPG.W',
            baseline: {
              2024: {
                annualMean: 3.30,
                min: 3.01,
                max: 3.67
              }
            }
          },
          prices: [
            {
              date: '2024 Avg',
              price: 3.30,
              minPrice: 3.30,
              maxPrice: 3.30,
              adj_date: '2024 Avg'
            }
          ]
        }
      };
      
      // Set price data - make sure to stringify the data
      console.log('Setting price_data...');
      await storage.set('price_data', JSON.stringify(initialPriceData));
      
      // Initialize combined price data
      const initialCombinedData = {
        metadata: {
          lastProcessed: new Date().toISOString(),
          quantities: {
            eggs: 1,
            milk: 1,
            gasoline_regular: 1
          },
          commodities: {
            eggs: {
              lastUpdated: new Date().toISOString(),
              dataSource: {
                2024: 'static-file',
                2025: 'usda-api'
              },
              baseline: {
                2024: {
                  annualMean: 3.15,
                  min: 1.55,
                  max: 6.57
                }
              },
              priceCount: 1
            },
            milk: {
              lastUpdated: new Date().toISOString(),
              dataSource: {
                2024: 'usda-api', 
                2025: 'usda-api'
              },
              baseline: {
                2024: {
                  annualMean: 3.41,
                  min: 3.05,
                  max: 3.99
                }
              },
              priceCount: 1
            },
            gasoline_regular: {
              lastUpdated: new Date().toISOString(),
              dataSource: {
                2024: 'eia-api',
                2025: 'eia-api'
              },
              name: 'Regular Gasoline (Gallon)',
              seriesId: 'PET.EMM_EPMR_PTE_NUS_DPG.W',
              baseline: {
                2024: {
                  annualMean: 3.30,
                  min: 3.01,
                  max: 3.67
                }
              },
              priceCount: 1
            }
          },
          latest: {
            basketPrice: 9.86,
            date: '2024 Avg',
            vsBaseline: {
              amount: 0,
              percent: 0
            }
          }
        },
        alignedPrices: [
          {
            commodity: "gasoline_regular",
            date: "2024 Avg",
            adjDate: "2024 Avg",
            price: 3.30,
            minPrice: 3.30,
            maxPrice: 3.30,
            isAggregated: false,
            priceCount: 1
          },
          {
            commodity: "milk",
            date: "2024 Avg",
            adjDate: "2024 Avg",
            price: 3.41,
            minPrice: 3.41,
            maxPrice: 3.41,
            isAggregated: false,
            priceCount: 1
          },
          {
            commodity: "eggs",
            date: "2024 Avg",
            adjDate: "2024 Avg",
            price: 3.15,
            minPrice: 3.15,
            maxPrice: 3.15,
            isAggregated: false,
            priceCount: 1
          }
        ],
        basket: [
          {
            date: "2024 Avg",
            adjDate: "2024 Avg",
            basketPrice: 9.86,
            prices: {
              eggs: 3.15,
              milk: 3.41,
              gasoline_regular: 3.30
            },
            formattedDate: "2024 Avg",
            isComplete: true
          }
        ],
        charts: {
          eggs: {
            data: [
              {
                date: "2024 Avg",
                adjDate: "2024 Avg",
                price: 3.15,
                minPrice: 3.15,
                maxPrice: 3.15,
                formattedDate: "2024 Avg"
              }
            ],
            latest: {
              date: "2024 Avg",
              adjDate: "2024 Avg",
              price: 3.15,
              minPrice: 3.15,
              maxPrice: 3.15,
              formattedDate: "2024 Avg"
            },
            vsBaseline: {
              amount: 0,
              percent: 0
            }
          },
          milk: {
            data: [
              {
                date: "2024 Avg",
                adjDate: "2024 Avg",
                price: 3.41,
                minPrice: 3.41,
                maxPrice: 3.41,
                formattedDate: "2024 Avg"
              }
            ],
            latest: {
              date: "2024 Avg",
              adjDate: "2024 Avg",
              price: 3.41,
              minPrice: 3.41,
              maxPrice: 3.41,
              formattedDate: "2024 Avg"
            },
            vsBaseline: {
              amount: 0,
              percent: 0
            }
          },
          gasoline_regular: {
            data: [
              {
                date: "2024 Avg",
                adjDate: "2024 Avg",
                price: 3.30,
                minPrice: 3.30,
                maxPrice: 3.30,
                formattedDate: "2024 Avg"
              }
            ],
            latest: {
              date: "2024 Avg",
              adjDate: "2024 Avg",
              price: 3.30,
              minPrice: 3.30,
              maxPrice: 3.30,
              formattedDate: "2024 Avg"
            },
            vsBaseline: {
              amount: 0,
              percent: 0
            }
          }
        }
      };
      
      // Set combined price data - make sure to stringify the data
      console.log('Setting combined_price_data...');
      await storage.set('combined_price_data', JSON.stringify(initialCombinedData));
      
      console.log('Data initialization complete!');
      
      return NextResponse.json({
        success: true,
        message: 'Price data initialized successfully with static data',
        timestamp: new Date().toISOString(),
        stats: {
          egg_prices: 1,
          milk_prices: 1,
          gasoline_prices: 1,
          basket_points: 1
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