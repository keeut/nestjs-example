import { IsString } from 'class-validator';

export class TransferRequestDto {
  @IsString()
  quoteId: string;
}
