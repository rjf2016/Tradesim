import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  decimal,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['BUY', 'SELL']);

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

// Portfolios table (1:1 with users)
export const portfolios = pgTable(
  'portfolios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cashBalance: decimal('cash_balance', { precision: 15, scale: 2 })
      .notNull()
      .default('100000.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('portfolios_user_id_idx').on(table.userId)],
);

// Holdings table
export const holdings = pgTable(
  'holdings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 10 }).notNull(),
    quantity: integer('quantity').notNull(),
    avgCostBasis: decimal('avg_cost_basis', { precision: 15, scale: 2 }).notNull(),
  },
  (table) => [
    uniqueIndex('holdings_portfolio_symbol_idx').on(table.portfolioId, table.symbol),
  ],
);

// Transactions table
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    portfolioId: uuid('portfolio_id')
      .notNull()
      .references(() => portfolios.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 10 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    pricePerShare: decimal('price_per_share', { precision: 15, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('transactions_portfolio_id_idx').on(table.portfolioId),
    index('transactions_executed_at_idx').on(table.executedAt),
  ],
);

// Watchlists table
export const watchlists = pgTable(
  'watchlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 10 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('watchlists_user_symbol_idx').on(table.userId, table.symbol),
  ],
);

// Stock cache table
export const stockCache = pgTable('stock_cache', {
  symbol: varchar('symbol', { length: 10 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  price: decimal('price', { precision: 15, scale: 2 }),
  change: decimal('change', { precision: 15, scale: 2 }),
  changePercent: decimal('change_percent', { precision: 8, scale: 4 }),
  high: decimal('high', { precision: 15, scale: 2 }),
  low: decimal('low', { precision: 15, scale: 2 }),
  open: decimal('open', { precision: 15, scale: 2 }),
  previousClose: decimal('previous_close', { precision: 15, scale: 2 }),
  volume: integer('volume'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Refresh tokens table
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('refresh_tokens_user_id_idx').on(table.userId),
    uniqueIndex('refresh_tokens_token_hash_idx').on(table.tokenHash),
  ],
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [users.id],
    references: [portfolios.userId],
  }),
  watchlist: many(watchlists),
  refreshTokens: many(refreshTokens),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  holdings: many(holdings),
  transactions: many(transactions),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [holdings.portfolioId],
    references: [portfolios.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [transactions.portfolioId],
    references: [portfolios.id],
  }),
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type WatchlistEntry = typeof watchlists.$inferSelect;
export type NewWatchlistEntry = typeof watchlists.$inferInsert;
export type StockCacheEntry = typeof stockCache.$inferSelect;
export type NewStockCacheEntry = typeof stockCache.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
