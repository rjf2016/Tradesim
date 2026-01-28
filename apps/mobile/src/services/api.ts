import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/config/api';
import type {
  Portfolio,
  StockQuote,
  StockSearchResult,
  Transaction,
  WatchlistItem,
  PriceHistory,
} from '@tradesim/shared';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken, refreshAccessToken, logout } = useAuthStore.getState();

    const makeRequest = async (token: string | null): Promise<Response> => {
      return fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });
    };

    let response = await makeRequest(accessToken);

    // If unauthorized, try to refresh the token
    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await makeRequest(newToken);
      } else {
        await logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message ?? 'Request failed');
    }

    return response.json();
  }

  // Portfolio
  async getPortfolio(): Promise<Portfolio> {
    return this.request<Portfolio>('/portfolio');
  }

  // Trades
  async buyStock(symbol: string, quantity: number): Promise<Transaction> {
    return this.request<Transaction>('/trades/buy', {
      method: 'POST',
      body: JSON.stringify({ symbol, quantity }),
    });
  }

  async sellStock(symbol: string, quantity: number): Promise<Transaction> {
    return this.request<Transaction>('/trades/sell', {
      method: 'POST',
      body: JSON.stringify({ symbol, quantity }),
    });
  }

  async getTransactionHistory(): Promise<Transaction[]> {
    return this.request<Transaction[]>('/trades/history');
  }

  // Stocks
  async getQuote(symbol: string): Promise<StockQuote> {
    return this.request<StockQuote>(`/stocks/quote/${symbol}`);
  }

  async searchStocks(query: string): Promise<StockSearchResult[]> {
    return this.request<StockSearchResult[]>(
      `/stocks/search?q=${encodeURIComponent(query)}`
    );
  }

  async getPopularStocks(): Promise<StockSearchResult[]> {
    return this.request<StockSearchResult[]>('/stocks/popular');
  }

  async getStockHistory(symbol: string): Promise<PriceHistory[]> {
    return this.request<PriceHistory[]>(`/stocks/history/${symbol}`);
  }

  // Watchlist
  async getWatchlist(): Promise<WatchlistItem[]> {
    return this.request<WatchlistItem[]>('/watchlist');
  }

  async addToWatchlist(symbol: string): Promise<void> {
    return this.request<void>(`/watchlist/${symbol}`, {
      method: 'POST',
    });
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    return this.request<void>(`/watchlist/${symbol}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
