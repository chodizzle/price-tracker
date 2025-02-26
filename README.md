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
- `npm run init-prices` - Initialize both milk and egg price data
- `npm run init-eggs` - Initialize only egg price data
- `npm run init-milk` - Initialize only milk price data
- `npm run update-eggs` - Update egg price data
- `npm run update-milk` - Update milk price data

## Data Structure

Price data is stored in `data/prices.json` with the following structure:

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
        "maxPrice": 2.50
      },
      // More price entries...
    ]
  },
  "milk": {
    // Similar structure for milk prices
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

## Troubleshooting

- If you encounter API errors, check your USDA API key and internet connection
- If the data doesn't load, try running `npm run init-prices` again
- For other issues, check the console for error messages