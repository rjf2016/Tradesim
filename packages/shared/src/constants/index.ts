// Initial cash balance for new users
export const INITIAL_CASH_BALANCE = 100_000;

// Alpha Vantage rate limits
export const ALPHA_VANTAGE_REQUESTS_PER_MINUTE = 5;
export const ALPHA_VANTAGE_REQUESTS_PER_DAY = 500;

// Cache TTL (in milliseconds)
export const QUOTE_CACHE_TTL = 60_000; // 1 minute
export const HISTORY_CACHE_TTL = 300_000; // 5 minutes
export const SEARCH_CACHE_TTL = 3600_000; // 1 hour

// JWT token expiry
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Popular stocks for discovery
export const POPULAR_STOCKS = [
  'AAPL',
  'MSFT',
  'GOOGL',
  'AMZN',
  'NVDA',
  'META',
  'TSLA',
  'BRK.B',
  'JPM',
  'V',
] as const;

// Transaction types
export const TRANSACTION_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;
