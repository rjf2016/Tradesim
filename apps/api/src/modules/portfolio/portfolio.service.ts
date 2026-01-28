import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database } from '../../database/database.module';
import { portfolios, holdings, transactions } from '../../database/schema';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly stocksService: StocksService,
  ) {}

  async getPortfolio(userId: string) {
    const portfolio = await this.db.query.portfolios.findFirst({
      where: eq(portfolios.userId, userId),
      with: {
        holdings: true,
      },
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Enrich holdings with current prices
    const enrichedHoldings = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const quote = await this.stocksService.getQuote(holding.symbol);
          const currentPrice = quote.price;
          const currentValue = currentPrice * holding.quantity;
          const totalCost = Number(holding.avgCostBasis) * holding.quantity;
          const gainLoss = currentValue - totalCost;
          const gainLossPercent = (gainLoss / totalCost) * 100;

          return {
            ...holding,
            avgCostBasis: Number(holding.avgCostBasis),
            currentPrice,
            currentValue,
            gainLoss,
            gainLossPercent,
          };
        } catch {
          // If we can't get the current price, use cost basis
          const avgCost = Number(holding.avgCostBasis);
          return {
            ...holding,
            avgCostBasis: avgCost,
            currentPrice: avgCost,
            currentValue: avgCost * holding.quantity,
            gainLoss: 0,
            gainLossPercent: 0,
          };
        }
      }),
    );

    return {
      ...portfolio,
      cashBalance: Number(portfolio.cashBalance),
      holdings: enrichedHoldings,
    };
  }

  async buyStock(userId: string, symbol: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const portfolio = await this.db.query.portfolios.findFirst({
      where: eq(portfolios.userId, userId),
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Get current price
    const quote = await this.stocksService.getQuote(symbol.toUpperCase());
    const totalCost = quote.price * quantity;

    // Check if user has enough cash
    if (Number(portfolio.cashBalance) < totalCost) {
      throw new BadRequestException('Insufficient funds');
    }

    // Start transaction
    return this.db.transaction(async (tx) => {
      // Deduct cash
      await tx
        .update(portfolios)
        .set({
          cashBalance: (Number(portfolio.cashBalance) - totalCost).toFixed(2),
        })
        .where(eq(portfolios.id, portfolio.id));

      // Update or create holding
      const existingHolding = await tx.query.holdings.findFirst({
        where: and(
          eq(holdings.portfolioId, portfolio.id),
          eq(holdings.symbol, symbol.toUpperCase()),
        ),
      });

      if (existingHolding) {
        // Calculate new average cost basis
        const totalShares = existingHolding.quantity + quantity;
        const totalValue =
          Number(existingHolding.avgCostBasis) * existingHolding.quantity +
          quote.price * quantity;
        const newAvgCost = totalValue / totalShares;

        await tx
          .update(holdings)
          .set({
            quantity: totalShares,
            avgCostBasis: newAvgCost.toFixed(2),
          })
          .where(eq(holdings.id, existingHolding.id));
      } else {
        await tx.insert(holdings).values({
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          quantity,
          avgCostBasis: quote.price.toFixed(2),
        });
      }

      // Record transaction
      const [transaction] = await tx
        .insert(transactions)
        .values({
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          type: 'BUY',
          quantity,
          pricePerShare: quote.price.toFixed(2),
          totalAmount: totalCost.toFixed(2),
        })
        .returning();

      return {
        ...transaction,
        pricePerShare: Number(transaction.pricePerShare),
        totalAmount: Number(transaction.totalAmount),
      };
    });
  }

  async sellStock(userId: string, symbol: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const portfolio = await this.db.query.portfolios.findFirst({
      where: eq(portfolios.userId, userId),
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    // Check if user has the shares
    const holding = await this.db.query.holdings.findFirst({
      where: and(
        eq(holdings.portfolioId, portfolio.id),
        eq(holdings.symbol, symbol.toUpperCase()),
      ),
    });

    if (!holding || holding.quantity < quantity) {
      throw new BadRequestException('Not enough shares to sell');
    }

    // Get current price
    const quote = await this.stocksService.getQuote(symbol.toUpperCase());
    const totalProceeds = quote.price * quantity;

    return this.db.transaction(async (tx) => {
      // Add cash
      await tx
        .update(portfolios)
        .set({
          cashBalance: (Number(portfolio.cashBalance) + totalProceeds).toFixed(2),
        })
        .where(eq(portfolios.id, portfolio.id));

      // Update or delete holding
      const remainingShares = holding.quantity - quantity;
      if (remainingShares === 0) {
        await tx.delete(holdings).where(eq(holdings.id, holding.id));
      } else {
        await tx
          .update(holdings)
          .set({ quantity: remainingShares })
          .where(eq(holdings.id, holding.id));
      }

      // Record transaction
      const [transaction] = await tx
        .insert(transactions)
        .values({
          portfolioId: portfolio.id,
          symbol: symbol.toUpperCase(),
          type: 'SELL',
          quantity,
          pricePerShare: quote.price.toFixed(2),
          totalAmount: totalProceeds.toFixed(2),
        })
        .returning();

      return {
        ...transaction,
        pricePerShare: Number(transaction.pricePerShare),
        totalAmount: Number(transaction.totalAmount),
      };
    });
  }

  async getTransactionHistory(userId: string) {
    const portfolio = await this.db.query.portfolios.findFirst({
      where: eq(portfolios.userId, userId),
    });

    if (!portfolio) {
      throw new NotFoundException('Portfolio not found');
    }

    const txns = await this.db.query.transactions.findMany({
      where: eq(transactions.portfolioId, portfolio.id),
      orderBy: [desc(transactions.executedAt)],
    });

    return txns.map((tx) => ({
      ...tx,
      pricePerShare: Number(tx.pricePerShare),
      totalAmount: Number(tx.totalAmount),
    }));
  }
}
