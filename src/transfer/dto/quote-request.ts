import { IsEnum, IsInt, IsNumber, IsPositive, IsString } from 'class-validator';
import { currency } from '../entities/transfer-constant';

export class QuoteRequestDto {
  @IsInt()
  @IsPositive({ message: 'NEGATIVE_NUMBER' })
  amount: number;

  @IsEnum(currency)
  targetCurrency: currency;

}
