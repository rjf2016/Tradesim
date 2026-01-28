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

// Generate a deterministic but varying price based on symbol and time
function generatePrice(stock: MockStock, seed?: number): number {
  const now = seed ?? Date.now();
  // Use a simple hash of time to create price variation
  const hourOfDay = Math.floor(now / (1000 * 60 * 60)) % 24;
  const dayOfYear = Math.floor(now / (1000 * 60 * 60 * 24)) % 365;

  // Create a pseudo-random variation based on time
  const variation = Math.sin(hourOfDay * 0.5 + dayOfYear * 0.1) * stock.volatility;
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
      basePrice: 50 + Math.random() * 200,
      volatility: 0.02,
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
    volume: Math.floor(10000000 + Math.random() * 50000000),
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
    basePrice: 100,
    volatility: 0.02,
  };

  const history = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const date = new Date(timestamp).toISOString().split('T')[0];
    const price = generatePrice(stock, timestamp);
    const dayVolatility = stock.volatility * 0.5;

    history.push({
      date,
      open: Math.round(price * (1 - dayVolatility * 0.3) * 100) / 100,
      high: Math.round(price * (1 + dayVolatility) * 100) / 100,
      low: Math.round(price * (1 - dayVolatility) * 100) / 100,
      close: price,
      volume: Math.floor(10000000 + Math.random() * 50000000),
    });
  }

  return history;
}
