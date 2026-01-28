import { Injectable } from '@nestjs/common';
import { AlphaVantageService } from './alpha-vantage.service';
import { POPULAR_STOCKS } from '@tradesim/shared';

@Injectable()
export class StocksService {
  constructor(private readonly alphaVantage: AlphaVantageService) {}

  async getQuote(symbol: string) {
    const quote = await this.alphaVantage.getQuote(symbol.toUpperCase());
    return {
      ...quote,
      lastUpdated: new Date().toISOString(),
    };
  }

  async searchStocks(query: string) {
    if (query.length < 1) {
      return [];
    }

    const results = await this.alphaVantage.searchSymbols(query);

    // Enrich with prices (limited to avoid rate limits)
    const enrichedResults = await Promise.all(
      results.slice(0, 5).map(async (result) => {
        try {
          const quote = await this.alphaVantage.getQuote(result.symbol);
          return {
            ...result,
            price: quote.price,
            changePercent: quote.changePercent,
          };
        } catch {
          return {
            ...result,
            price: 0,
            changePercent: 0,
          };
        }
      }),
    );

    return enrichedResults;
  }

  async getPopularStocks() {
    const results = await Promise.all(
      POPULAR_STOCKS.map(async (symbol) => {
        try {
          const quote = await this.alphaVantage.getQuote(symbol);
          return {
            symbol,
            name: quote.name,
            type: 'Equity',
            region: 'United States',
            price: quote.price,
            changePercent: quote.changePercent,
          };
        } catch {
          return null;
        }
      }),
    );

    return results.filter((r) => r !== null);
  }

  async getStockHistory(symbol: string) {
    const history = await this.alphaVantage.getDailyHistory(symbol.toUpperCase());

    return history.map((point) => ({
      ...point,
      price: point.close, // Alias close as price for simplicity
    }));
  }
}
