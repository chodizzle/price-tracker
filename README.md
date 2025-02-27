# Commodity Price Tracker

A web application that displays price trends for common commodities (milk and eggs) using data from the USDA API.

## Setup Instructions

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file in the root directory with your USDA API key:
   ```
   USDA_API_KEY=your_api_key_here
   ```
4. Initialize the price data:
   ```
   npm run init-prices
   ```
5. Start the development server:
   ```
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run init-prices` - Initialize both milk and egg price data and process combined data
- `npm run init-eggs` - Initialize only egg price data
- `npm run init-milk` - Initialize only milk price data
- `npm run update-eggs` - Update egg price data and reprocess combined data
- `npm run update-milk` - Update milk price data and reprocess combined data
- `npm run process-prices` - Process raw price data into aligned and combined data

## Data Structure

The application uses two data files:

### Raw Data (data/prices.json)

Contains the original price data with the following structure:

```json
{
  "eggs": {
    "metadata": {
      "lastUpdated": "2025-02-24T12:00:00.000Z",
      "dataSource": {
        "2024": "static-file",
        "2025": "usda-api"
      },
      "baseline": {
        "2024": {
          "annualMean": 2.25,
          "min": 1.55,
          "max": 5.59
        }
      }
    },
    "prices": [
      {
        "date": "2024-01-05",
        "price": 2.35,
        "minPrice": 2.20,
        "maxPrice": 2.50,
        "adj_date": "2024-01-05"
      },
      // More price entries...
    ]
  },
  "milk": {
    // Similar structure for milk prices
  }
}
```

### Processed Data (data/combined-prices.json)

Contains processed data with aligned dates and basket calculations:

```json
{
  "metadata": {
    "lastProcessed": "2025-02-24T12:00:00.000Z",
    "weights": {
      "eggs": 1,
      "milk": 2
    },
    "commodities": {
      "eggs": {
        // Metadata copied from raw data
      },
      "milk": {
        // Metadata copied from raw data
      }
    },
    "latest": {
      "basketPrice": 12.45,
      "date": "2025-02-14",
      "vsBaseline": {
        "amount": 3.22,
        "percent": 34.9
      }
    }
  },
  "alignedPrices": [
    {
      "commodity": "eggs",
      "date": "2024 Avg",
      "adjDate": "2024 Avg",
      "price": 2.25,
      "minPrice": 2.25,
      "maxPrice": 2.25,
      "isAggregated": false,
      "priceCount": 1
    },
    // More aligned price entries...
  ],
  "basket": [
    {
      "date": "2024 Avg",
      "adjDate": "2024 Avg",
      "basketPrice": 9.23,
      "prices": {
        "eggs": 2.25,
        "milk": 3.41
      },
      "formattedDate": "2024 Avg",
      "isComplete": true
    },
    // More basket entries...
  ],
  "charts": {
    "eggs": {
      "data": [
        // Formatted data for egg chart
      ],
      "latest": {
        // Latest price and change info
      },
      "vsBaseline": {
        "amount": 5.15,
        "percent": 228.9
      }
    },
    "milk": {
      // Similar structure for milk chart
    }
  }
}
```

## Technical Details

- Frontend built with Next.js 15 and React 19
- UI components from ShadCN UI
- Charts and data visualization using Recharts
- Data from USDA Market News API
- Egg prices for 2024 parsed from static file, 2025 from API
- Milk prices from USDA API
- Price alignment to Fridays for consistent comparison
- Combined "basket" price based on weighted average

## Data Processing Pipeline

1. Raw data is initialized and fetched from API using `init-prices.js`
2. Dates are aligned to Fridays for consistent comparison
3. Redundant entries for the same date are averaged
4. A "basket" price is calculated based on weighted commodity prices
5. All processed data is saved to `combined-prices.json`
6. The frontend displays processed data from the API endpoint

## Troubleshooting

- If you encounter API errors, check your USDA API key and internet connection
- If the data doesn't load, try running `npm run init-prices` again
- If the combined data is not showing, run `npm run process-prices` to generate it
- For other issues, check the console for error messages