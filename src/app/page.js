'use client';

import CommodityPriceTracker from '../components/CommodityPriceTracker';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Trumpflation.info</h1>
        <p className="text-center text-gray-600">It&apos;s just data, broh</p>
      </header>
      
      <div className="flex-grow max-w-7xl w-full mx-auto">
        <CommodityPriceTracker />
      </div>
      
      <footer className="mt-16 pb-8 text-center text-gray-500 text-sm">
        <div className="max-w-2xl mx-auto">
          <p className="mb-2">Data sources:</p>
          <div className="flex justify-center gap-4">
            <a 
              href="https://www.ers.usda.gov/developer/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              USDA Market News API
            </a>
            <span>|</span>
            <a 
              href="https://www.eia.gov/opendata/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EIA Open Data API
            </a>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} Commodity Price Tracker</p>
        </div>
      </footer>
    </main>
  );
}