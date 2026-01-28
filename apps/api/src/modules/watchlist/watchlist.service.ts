import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '../../database/database.module';
import { watchlists } from '../../database/schema';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class WatchlistService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly stocksService: StocksService,
  ) {}

  async getWatchlist(userId: string) {
    const entries = await this.db.query.watchlists.findMany({
      where: eq(watchlists.userId, userId),
      orderBy: (watchlists, { desc }) => [desc(watchlists.addedAt)],
    });

    // Enrich with current prices
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        try {
          const quote = await this.stocksService.getQuote(entry.symbol);
          return {
            id: entry.id,
            userId: entry.userId,
            symbol: entry.symbol,
            name: quote.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            addedAt: entry.addedAt.toISOString(),
          };
        } catch {
          return {
            id: entry.id,
            userId: entry.userId,
            symbol: entry.symbol,
            name: entry.symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            addedAt: entry.addedAt.toISOString(),
          };
        }
      }),
    );

    return enrichedEntries;
  }

  async addToWatchlist(userId: string, symbol: string) {
    const upperSymbol = symbol.toUpperCase();

    // Check if already exists
    const existing = await this.db.query.watchlists.findFirst({
      where: and(
        eq(watchlists.userId, userId),
        eq(watchlists.symbol, upperSymbol),
      ),
    });

    if (existing) {
      throw new ConflictException('Symbol already in watchlist');
    }

    // Validate symbol exists
    await this.stocksService.getQuote(upperSymbol);

    await this.db.insert(watchlists).values({
      userId,
      symbol: upperSymbol,
    });

    return { message: 'Added to watchlist' };
  }

  async removeFromWatchlist(userId: string, symbol: string) {
    const upperSymbol = symbol.toUpperCase();

    await this.db
      .delete(watchlists)
      .where(
        and(eq(watchlists.userId, userId), eq(watchlists.symbol, upperSymbol)),
      );

    return { message: 'Removed from watchlist' };
  }
}
