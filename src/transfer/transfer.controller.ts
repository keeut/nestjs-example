import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { QuoteRequestDto } from './dto/quote-request';
import { TransferRequestDto } from './dto/transfer-request';
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async requestQuote(@Req() req, @Body() quoteRequestDto: QuoteRequestDto) {
    const { idx, userId } = req.user;
    const quote = await this.transferService.requestQuote(idx, quoteRequestDto);
    return {
      quote: {
        quoteId: quote.quoteId,
        exchangeRate: quote.exchangeRate,
        expireTime: quote.expireTime,
        targetAmount: quote.targetAmount,
      },
    };
  }

  @Post('request')
  @HttpCode(HttpStatus.OK)
  async requestTransfer(
    @Req() req,
    @Body() transferRequestDto: TransferRequestDto,
  ) {
    const { idx, userId, idType } = req.user;
    await this.transferService.requestTransfer(
      idx,
      idType,
      transferRequestDto,
    );
    return;
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async getTransferList(@Req() req) {
    const { userId, name } = req.user;
    const history = await this.transferService.getTransferList(userId);
    const today = new Date();

    const todayTransfer = history.filter(
      (item) =>
        item.requestedDate.getDate() === today.getDate() &&
        item.requestedDate.getMonth() === today.getMonth() &&
        item.requestedDate.getFullYear() === today.getFullYear(),
    );
    const todayTransferUsdAmount = todayTransfer.reduce(
      (acc, cur) => acc + cur.usdAmount,
      0,
    );

    return {
      userId,
      name,
      todaytransferCount: todayTransfer.length,
      todayTransferUsdAmount: todayTransferUsdAmount,
      history: history.map((item) => ({
        sourceAmount: item.sourceAmount,
        fee: item.fee,
        usdExchangeRate: item.usdExchangeRate,
        usdAmount: item.usdAmount,
        targetCurrency: item.targetCurrency,
        exchangeRate: item.exchangeRate,
        targetAmount: item.targetAmount,
        requestedDate: item.requestedDate,
      })),
    };
  }
}
