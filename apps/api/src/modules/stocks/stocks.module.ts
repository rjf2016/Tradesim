import { Module } from '@nestjs/common';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { AlphaVantageService } from './alpha-vantage.service';

@Module({
  controllers: [StocksController],
  providers: [StocksService, AlphaVantageService],
  exports: [StocksService],
})
export class StocksModule {}
