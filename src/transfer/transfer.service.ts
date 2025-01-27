import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { QuoteRequestDto } from './dto/quote-request';
import { Quote } from './entities/quote.entity';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { currency } from './entities/transfer-constant';
import { HttpService } from '@nestjs/axios';
import { async, lastValueFrom } from 'rxjs';
import { TransferRequestDto } from './dto/transfer-request';
import { userIdType } from '../user/entities/user-constant';
import { Transfer } from './entities/transfer.entity';
import { ConfigService } from '@nestjs/config';
import { getTransferConfigs, getTransferFeesConfig } from '../config/transfer';

@Injectable()
export class TransferService {
  private readonly CURRENCY_FRACTION_DIGITS: Record<string, number>;
  private readonly DAY_TRANSFER_LIMIT: Record<string, number>;
  private readonly EXCHANGE_RATE_API: string;
  private readonly QUOTE_EXPIRE_PERIOD: number;
  private readonly TRANSFER_FEES: any;
  private readonly MAX_DECIMAL_DIGITS: number;
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    private readonly httpService: HttpService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {
    const transferConfigs = getTransferConfigs(this.configService);
    this.CURRENCY_FRACTION_DIGITS = transferConfigs.CURRENCY_FRACTION_DIGITS;
    this.DAY_TRANSFER_LIMIT = transferConfigs.DAY_TRANSFER_LIMIT;
    this.EXCHANGE_RATE_API = transferConfigs.EXCHANGE_RATE_API;
    this.QUOTE_EXPIRE_PERIOD = transferConfigs.QUOTE_EXPIRE_PERIOD;
    this.MAX_DECIMAL_DIGITS = transferConfigs.MAX_DECIMAL_DIGITS;

    this.TRANSFER_FEES = getTransferFeesConfig(this.configService);
  }

  async requestQuote(
    userIdx: number,
    quoteRequestDto: QuoteRequestDto,
  ): Promise<Quote> {
    const { amount, targetCurrency } = quoteRequestDto;
    const exchangeRates = await this.getExchangeRates();
    const fee = this.calculateFee(amount, targetCurrency);
    const targetAmount = parseFloat(
      ((amount - fee) / exchangeRates[targetCurrency]).toFixed(
        this.CURRENCY_FRACTION_DIGITS[targetCurrency],
      ),
    );
    const usdAmount = parseFloat(
      ((amount - fee) / exchangeRates[currency.USD]).toFixed(
        this.CURRENCY_FRACTION_DIGITS[currency.USD],
      ),
    );
    if (targetAmount <= 0) {
      throw new HttpException('NEGATIVE_NUMBER', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.quoteRepository.save({
        amount,
        targetAmount,
        fee,
        usdAmount,
        targetCurrency,
        exchangeRate: exchangeRates[targetCurrency],
        usdExchangeRate: exchangeRates[currency.USD],
        user: { idx: userIdx },
        expireTime: new Date(Date.now() + this.QUOTE_EXPIRE_PERIOD),
      });
    } catch (error) {
      if (error.code == 'ER_NO_REFERENCED_ROW_2') {
        throw new HttpException('INVALID_USER', HttpStatus.BAD_REQUEST);
      }
      console.error(error);
      throw new HttpException(
        'UNKNOWN_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async requestTransfer(
    userIdx: number,
    userType: userIdType,
    dto: TransferRequestDto,
  ) {
    const { quoteId } = dto;

    const quote = await this.quoteRepository.findOne({
      where: { quoteId },
    });

    if (!quote) {
      console.error('Invalid quoteId');
      throw new HttpException('UNKNOWN_ERROR', HttpStatus.BAD_REQUEST);
    }
    if (quote.userIdx !== userIdx) {
      throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED);
    }
    if (new Date() > new Date(quote.expireTime)) {
      throw new HttpException('QUOTE_EXPIRED', HttpStatus.BAD_REQUEST);
    }
    if (!this.DAY_TRANSFER_LIMIT[userType]) {
      console.error('Invalid userType');
      throw new HttpException(
        'UNKNOWN_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    await this.dataSource.transaction(async (manager) => {
      const todayTotalTransfer = await manager
        .createQueryBuilder('transfer', 'transfer')
        .select('SUM(transfer.usdAmount)', 'totalUsd')
        .where('transfer.userIdx = :userIdx', { userIdx })
        .andWhere('DATE(transfer.requestedDate) = CURDATE()')
        .setLock('pessimistic_write')
        .getRawOne();

      const todayTotalUsdTransferAmount = todayTotalTransfer?.totalUsd || 0;

      if (
        Number(todayTotalUsdTransferAmount) + Number(quote.usdAmount) >
        this.DAY_TRANSFER_LIMIT[userType]
      ) {
        console.log(
          '[Transfer Limit exceeded]',
          'todayTotalUsdTransferAmount:',
          todayTotalUsdTransferAmount,
          'quote.usdAmount:',
          quote.usdAmount,
          'DAY_TRANSFER_LIMIT[userType]:',
          this.DAY_TRANSFER_LIMIT[userType],
        );
        throw new HttpException('LIMIT_EXCESS', HttpStatus.BAD_REQUEST);
      }
      try {
        const transferEntity = manager.create(Transfer, {
          quoteId,
          sourceAmount: quote.amount,
          fee: quote.fee,
          usdAmount: quote.usdAmount,
          targetCurrency: quote.targetCurrency,
          usdExchangeRate: quote.usdExchangeRate,
          exchangeRate: quote.exchangeRate,
          targetAmount: quote.targetAmount,
          user: { idx: userIdx },
        });
        return await manager.save(transferEntity);
      } catch (error) {
        if (error.code == 'ER_DUP_ENTRY') {
          throw new HttpException(
            'ALREADY_TRANSFERRED QUOTE',
            HttpStatus.CONFLICT,
          );
        }
        console.error(error);
        throw new HttpException(
          'UNKNOWN_ERROR',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });
  }

  async getTransferList(userId: string) {
    return await this.transferRepository.find({ where: { user: { userId } } });
  }

  calculateFee(amount: number, targetCurrency: currency) {
    if (targetCurrency === currency.USD) {
      if (amount <= 1000000) {
        return (
          (amount * this.TRANSFER_FEES.USD_UNDER_100.percent) / 100 +
          this.TRANSFER_FEES.USD_UNDER_100.fixed
        );
      } else {
        return (
          (amount * this.TRANSFER_FEES.USD_OVER_100.percent) / 100 +
          this.TRANSFER_FEES.USD_OVER_100.fixed
        );
      }
    }
    if (targetCurrency === currency.JPY) {
      return (
        (amount * this.TRANSFER_FEES.JPY.percent) / 100 +
        this.TRANSFER_FEES.JPY.fixed
      );
    }
    throw new HttpException('Unsupported currency', HttpStatus.BAD_REQUEST);
  }

  async getExchangeRates(): Promise<Record<currency, number>> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(this.EXCHANGE_RATE_API),
      );
      const data = response.data;
      const currencyExchangeRates: Record<currency, number> = {
        [currency.USD]: 0,
        [currency.JPY]: 0,
      };

      data.forEach((item) => {
        currencyExchangeRates[item.currencyCode] = parseFloat(
          (item.basePrice / item.currencyUnit).toFixed(this.MAX_DECIMAL_DIGITS),
        );
      });

      if (
        Number.isNaN(currencyExchangeRates[currency.USD]) ||
        Number.isNaN(currencyExchangeRates[currency.JPY]) ||
        currencyExchangeRates[currency.USD] === 0 ||
        currencyExchangeRates[currency.JPY] === 0
      ) {
        console.error('cannot get exchange rate');
        throw new Error('Cannot get exchange rate');
      }
      return currencyExchangeRates;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'UNKNOWN_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
