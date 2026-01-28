import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { AlphaVantageService } from './alpha-vantage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(
    private readonly stocksService: StocksService,
    private readonly alphaVantageService: AlphaVantageService,
  ) {}

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    return this.stocksService.getQuote(symbol);
  }

  @Get('search')
  async searchStocks(@Query('q') query: string) {
    return this.stocksService.searchStocks(query ?? '');
  }

  @Get('popular')
  async getPopularStocks() {
    return this.stocksService.getPopularStocks();
  }

  @Get('history/:symbol')
  async getStockHistory(@Param('symbol') symbol: string) {
    return this.stocksService.getStockHistory(symbol);
  }

  @Get('api-usage')
  getApiUsage() {
    return this.alphaVantageService.getUsageStats();
  }
}
