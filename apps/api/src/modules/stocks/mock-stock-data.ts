// Realistic mock stock data for development
// This allows development without consuming Alpha Vantage API quota

export interface MockStock {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number; // How much the price can vary (0-1)
}

export const MOCK_STOCKS: MockStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 178.50, volatility: 0.02 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 378.90, volatility: 0.018 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 141.25, volatility: 0.022 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 178.75, volatility: 0.025 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 495.20, volatility: 0.035 },
  { symbol: 'META', name: 'Meta Platforms Inc.', basePrice: 505.60, volatility: 0.028 },
  { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 248.50, volatility: 0.04 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', basePrice: 363.15, volatility: 0.012 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', basePrice: 198.40, volatility: 0.015 },
  { symbol: 'V', name: 'Visa Inc.', basePrice: 279.80, volatility: 0.014 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', basePrice: 156.30, volatility: 0.01 },
  { symbol: 'WMT', name: 'Walmart Inc.', basePrice: 165.25, volatility: 0.012 },
  { symbol: 'PG', name: 'Procter & Gamble Co.', basePrice: 152.40, volatility: 0.01 },
  { symbol: 'MA', name: 'Mastercard Inc.', basePrice: 458.90, volatility: 0.015 },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', basePrice: 527.60, volatility: 0.016 },
  { symbol: 'HD', name: 'The Home Depot Inc.', basePrice: 345.20, volatility: 0.018 },
  { symbol: 'DIS', name: 'The Walt Disney Company', basePrice: 112.45, volatility: 0.025 },
  { symbol: 'NFLX', name: 'Netflix Inc.', basePrice: 485.30, volatility: 0.03 },
  { symbol: 'ADBE', name: 'Adobe Inc.', basePrice: 578.90, volatility: 0.022 },
  { symbol: 'CRM', name: 'Salesforce Inc.', basePrice: 272.15, volatility: 0.024 },
];

// Simple hash function to create a unique seed from a string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator for consistent but unique patterns per stock
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a deterministic but varying price based on symbol and time
function generatePrice(stock: MockStock, timestamp?: number): number {
  const now = timestamp ?? Date.now();
  const symbolSeed = hashCode(stock.symbol);

  // Create multiple wave components for more realistic movement
  const hourOfDay = Math.floor(now / (1000 * 60 * 60));
  const dayFraction = (now % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60 * 24);

  // Use symbol seed to create unique phase offsets and frequencies
  const phase1 = (symbolSeed % 100) / 10;
  const phase2 = (symbolSeed % 50) / 5;
  const phase3 = (symbolSeed % 25) / 2.5;
  const freq1 = 0.3 + (symbolSeed % 10) / 20;
  const freq2 = 0.7 + (symbolSeed % 15) / 15;
  const freq3 = 1.5 + (symbolSeed % 20) / 10;

  // Combine multiple sine waves with different frequencies for realistic movement
  const wave1 = Math.sin(hourOfDay * freq1 + phase1) * 0.4;
  const wave2 = Math.sin(hourOfDay * freq2 + phase2) * 0.3;
  const wave3 = Math.sin(hourOfDay * freq3 + phase3) * 0.2;
  const noise = seededRandom(hourOfDay + symbolSeed) * 0.2 - 0.1;

  // Add a trend component based on symbol
  const trendDirection = (symbolSeed % 3) - 1; // -1, 0, or 1
  const daysSinceEpoch = Math.floor(now / (1000 * 60 * 60 * 24));
  const trend = trendDirection * (daysSinceEpoch % 30) * 0.001;

  const variation = (wave1 + wave2 + wave3 + noise + trend) * stock.volatility;
  const price = stock.basePrice * (1 + variation);

  return Math.round(price * 100) / 100;
}

function generateChange(stock: MockStock): { change: number; changePercent: number } {
  const currentPrice = generatePrice(stock);
  const previousPrice = generatePrice(stock, Date.now() - 24 * 60 * 60 * 1000);
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;

  return {
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

export function getMockQuote(symbol: string) {
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol.toUpperCase());

  if (!stock) {
    // Generate a random stock for unknown symbols
    const unknownStock: MockStock = {
      symbol: symbol.toUpperCase(),
      name: `${symbol.toUpperCase()} Corp.`,
      basePrice: 50 + hashCode(symbol) % 200,
      volatility: 0.02 + (hashCode(symbol) % 20) / 1000,
    };
    return generateMockQuote(unknownStock);
  }

  return generateMockQuote(stock);
}

function generateMockQuote(stock: MockStock) {
  const price = generatePrice(stock);
  const { change, changePercent } = generateChange(stock);
  const high = price * (1 + stock.volatility * 0.5);
  const low = price * (1 - stock.volatility * 0.5);

  return {
    symbol: stock.symbol,
    name: stock.name,
    price,
    change,
    changePercent,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    open: Math.round((price - change * 0.3) * 100) / 100,
    previousClose: Math.round((price - change) * 100) / 100,
    volume: Math.floor(10000000 + seededRandom(hashCode(stock.symbol) + Date.now() / 100000) * 50000000),
  };
}

export function searchMockStocks(query: string) {
  const lowerQuery = query.toLowerCase();
  return MOCK_STOCKS.filter(
    stock =>
      stock.symbol.toLowerCase().includes(lowerQuery) ||
      stock.name.toLowerCase().includes(lowerQuery)
  ).map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    type: 'Equity',
    region: 'United States',
  }));
}

export function getMockHistory(symbol: string, days = 30) {
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol.toUpperCase()) ?? {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Corp.`,
    basePrice: 100 + hashCode(symbol) % 100,
    volatility: 0.02 + (hashCode(symbol) % 20) / 1000,
  };

  const history = [];
  const now = Date.now();
  const symbolSeed = hashCode(stock.symbol);

  // Generate intraday data for today (hourly points for the last 24 hours)
  const hoursToGenerate = 24;
  for (let h = hoursToGenerate - 1; h >= 0; h--) {
    const timestamp = now - h * 60 * 60 * 1000;
    const date = new Date(timestamp);
    const dateStr = date.toISOString();

    // Generate price with hourly variation
    const hourSeed = symbolSeed + Math.floor(timestamp / (60 * 60 * 1000));
    const basePrice = generatePrice(stock, timestamp);
    const hourlyNoise = (seededRandom(hourSeed) - 0.5) * stock.volatility * 0.3;
    const price = Math.round(basePrice * (1 + hourlyNoise) * 100) / 100;

    history.push({
      date: dateStr,
      open: price,
      high: price,
      low: price,
      close: price,
      price: price,
      volume: Math.floor(1000000 + seededRandom(hourSeed) * 5000000),
    });
  }

  // Generate daily data for previous days
  for (let i = days - 1; i >= 1; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const date = new Date(timestamp).toISOString().split('T')[0];
    const closePrice = generatePrice(stock, timestamp);

    // Generate intraday variation that's unique per stock and day
    const daySeed = symbolSeed + i;
    const intradayVariation = stock.volatility * 0.5;
    const openOffset = (seededRandom(daySeed) - 0.5) * intradayVariation;
    const highOffset = seededRandom(daySeed + 1) * intradayVariation;
    const lowOffset = seededRandom(daySeed + 2) * intradayVariation;

    const open = closePrice * (1 + openOffset);
    const high = Math.max(open, closePrice) * (1 + highOffset);
    const low = Math.min(open, closePrice) * (1 - lowOffset);

    history.push({
      date,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: closePrice,
      price: closePrice,
      volume: Math.floor(10000000 + seededRandom(daySeed + 3) * 50000000),
    });
  }

  // Sort by date ascending
  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return history;
}
