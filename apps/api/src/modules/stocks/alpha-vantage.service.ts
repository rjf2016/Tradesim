import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '../../database/database.module';
import { stockCache } from '../../database/schema';
import { getMockQuote, searchMockStocks, getMockHistory } from './mock-stock-data';

interface AlphaVantageQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
}

interface AlphaVantageSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
}

@Injectable()
export class AlphaVantageService {
  private readonly logger = new Logger(AlphaVantageService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.alphavantage.co/query';
  private readonly useMockData: boolean;
  private readonly cacheTtlMs: number;
  private readonly maxRequestsPerDay: number;
  private requestTimestamps: number[] = [];
  private dailyRequestCount = 0;
  private lastResetDate: string = '';

  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
  ) {
    this.apiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY', 'demo');

    // Use mock data by default in development, or if explicitly set
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.useMockData = this.configService.get<boolean>(
      'USE_MOCK_STOCK_DATA',
      nodeEnv === 'development'
    );

    // Cache TTL: 4 hours in dev (to minimize API calls), 1 minute in production
    this.cacheTtlMs = this.configService.get<number>(
      'STOCK_CACHE_TTL_MS',
      this.useMockData ? 4 * 60 * 60 * 1000 : 60 * 1000
    );

    // Max requests per day (free tier = 25)
    this.maxRequestsPerDay = this.configService.get<number>(
      'ALPHA_VANTAGE_MAX_DAILY_REQUESTS',
      25
    );

    if (this.useMockData) {
      this.logger.log('Using MOCK stock data - no API calls will be made');
    } else {
      this.logger.log(`Using REAL Alpha Vantage API (max ${this.maxRequestsPerDay} requests/day)`);
    }
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
      this.logger.log('Daily request counter reset');
    }
  }

  private canMakeRequest(): boolean {
    this.resetDailyCounterIfNeeded();

    // Check daily limit
    if (this.dailyRequestCount >= this.maxRequestsPerDay) {
      this.logger.warn(`Daily API limit reached (${this.maxRequestsPerDay} requests)`);
      return false;
    }

    // Check per-minute rate limit (5 per minute for free tier)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);

    if (this.requestTimestamps.length >= 5) {
      this.logger.warn('Per-minute rate limit reached (5 requests/min)');
      return false;
    }

    return true;
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
    this.dailyRequestCount++;
    this.logger.debug(`API request made. Daily count: ${this.dailyRequestCount}/${this.maxRequestsPerDay}`);
  }

  async getQuote(symbol: string): Promise<AlphaVantageQuote> {
    // Use mock data if enabled
    if (this.useMockData) {
      return getMockQuote(symbol);
    }

    // Check cache first
    const cached = await this.db.query.stockCache.findFirst({
      where: eq(stockCache.symbol, symbol.toUpperCase()),
    });

    if (cached && cached.updatedAt && cached.price) {
      const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
      if (cacheAge < this.cacheTtlMs) {
        this.logger.debug(`Cache hit for ${symbol} (age: ${Math.round(cacheAge / 1000)}s)`);
        return this.cachedToQuote(cached);
      }
    }

    // Check if we can make a request
    if (!this.canMakeRequest()) {
      if (cached && cached.price) {
        this.logger.warn(`Rate limited - returning stale cache for ${symbol}`);
        return this.cachedToQuote(cached);
      }
      throw new HttpException(
        'API rate limit exceeded. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Fetch from API
    try {
      this.recordRequest();

      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      if (data['Note']) {
        // API limit message from Alpha Vantage
        this.logger.warn(`Alpha Vantage API note: ${data['Note']}`);
        if (cached && cached.price) {
          return this.cachedToQuote(cached);
        }
        throw new HttpException('API limit reached', HttpStatus.TOO_MANY_REQUESTS);
      }

      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) {
        throw new Error('Invalid response from Alpha Vantage');
      }

      const result: AlphaVantageQuote = {
        symbol: quote['01. symbol'],
        name: quote['01. symbol'], // Alpha Vantage doesn't return name in quote
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '') ?? '0'),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        volume: parseInt(quote['06. volume'], 10),
      };

      // Update cache
      await this.updateCache(result);

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch quote for ${symbol}: ${error}`);
      // If we have cached data, return it even if stale
      if (cached && cached.price) {
        return this.cachedToQuote(cached);
      }
      throw error;
    }
  }

  async searchSymbols(query: string): Promise<AlphaVantageSearchResult[]> {
    if (this.useMockData) {
      return searchMockStocks(query);
    }

    if (!this.canMakeRequest()) {
      this.logger.warn('Rate limited - returning empty search results');
      return [];
    }

    try {
      this.recordRequest();

      const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        return [];
      }

      const matches = data['bestMatches'] ?? [];

      return matches.map((match: Record<string, string>) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
      }));
    } catch {
      return [];
    }
  }

  async getDailyHistory(
    symbol: string,
  ): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
    if (this.useMockData) {
      return getMockHistory(symbol);
    }

    if (!this.canMakeRequest()) {
      this.logger.warn('Rate limited - returning empty history');
      return [];
    }

    try {
      this.recordRequest();

      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        return [];
      }

      const timeSeries = data['Time Series (Daily)'] ?? {};

      return Object.entries(timeSeries)
        .slice(0, 30) // Last 30 days
        .map(([date, values]: [string, Record<string, string>]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'], 10),
        }))
        .reverse();
    } catch {
      return [];
    }
  }

  // Helper to get current API usage stats
  getUsageStats() {
    this.resetDailyCounterIfNeeded();
    return {
      dailyRequestsUsed: this.dailyRequestCount,
      dailyRequestsLimit: this.maxRequestsPerDay,
      dailyRequestsRemaining: this.maxRequestsPerDay - this.dailyRequestCount,
      usingMockData: this.useMockData,
    };
  }

  private cachedToQuote(cached: typeof stockCache.$inferSelect): AlphaVantageQuote {
    return {
      symbol: cached.symbol,
      name: cached.name ?? cached.symbol,
      price: Number(cached.price),
      change: Number(cached.change ?? 0),
      changePercent: Number(cached.changePercent ?? 0),
      high: Number(cached.high ?? cached.price),
      low: Number(cached.low ?? cached.price),
      open: Number(cached.open ?? cached.price),
      previousClose: Number(cached.previousClose ?? cached.price),
      volume: cached.volume ?? 0,
    };
  }

  private async updateCache(quote: AlphaVantageQuote): Promise<void> {
    await this.db
      .insert(stockCache)
      .values({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price.toFixed(2),
        change: quote.change.toFixed(2),
        changePercent: quote.changePercent.toFixed(4),
        high: quote.high.toFixed(2),
        low: quote.low.toFixed(2),
        open: quote.open.toFixed(2),
        previousClose: quote.previousClose.toFixed(2),
        volume: quote.volume,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: stockCache.symbol,
        set: {
          price: quote.price.toFixed(2),
          change: quote.change.toFixed(2),
          changePercent: quote.changePercent.toFixed(4),
          high: quote.high.toFixed(2),
          low: quote.low.toFixed(2),
          open: quote.open.toFixed(2),
          previousClose: quote.previousClose.toFixed(2),
          volume: quote.volume,
          updatedAt: new Date(),
        },
      });
  }
}
