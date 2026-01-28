import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getWatchlist(@Request() req: any) {
    return this.watchlistService.getWatchlist(req.user.id);
  }

  @Post(':symbol')
  async addToWatchlist(@Request() req: any, @Param('symbol') symbol: string) {
    return this.watchlistService.addToWatchlist(req.user.id, symbol);
  }

  @Delete(':symbol')
  async removeFromWatchlist(
    @Request() req: any,
    @Param('symbol') symbol: string,
  ) {
    return this.watchlistService.removeFromWatchlist(req.user.id, symbol);
  }
}
