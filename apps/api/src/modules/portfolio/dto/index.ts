import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

export class TradeDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
