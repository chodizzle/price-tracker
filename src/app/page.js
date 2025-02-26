'use client';

import CommodityPriceTracker from '../components/CommodityPriceTracker';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Commodity Price Tracker</h1>
      <div className="flex-grow max-w-7xl w-full mx-auto">
        <CommodityPriceTracker />
      </div>
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Data source: USDA Market News API</p>
      </footer>
    </main>
  );
}