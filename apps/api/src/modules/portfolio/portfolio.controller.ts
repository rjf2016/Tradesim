import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TradeDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('portfolio')
  async getPortfolio(@Request() req: any) {
    return this.portfolioService.getPortfolio(req.user.id);
  }

  @Post('trades/buy')
  async buyStock(@Request() req: any, @Body() dto: TradeDto) {
    return this.portfolioService.buyStock(req.user.id, dto.symbol, dto.quantity);
  }

  @Post('trades/sell')
  async sellStock(@Request() req: any, @Body() dto: TradeDto) {
    return this.portfolioService.sellStock(req.user.id, dto.symbol, dto.quantity);
  }

  @Get('trades/history')
  async getTransactionHistory(@Request() req: any) {
    return this.portfolioService.getTransactionHistory(req.user.id);
  }
}
