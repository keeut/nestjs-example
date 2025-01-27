import { Test, TestingModule } from '@nestjs/testing';
import { TransferService } from './transfer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { Transfer } from './entities/transfer.entity';
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { currency } from './entities/transfer-constant';
import { userIdType } from '../user/entities/user-constant';
import { DataSource } from 'typeorm';
import { throwError } from 'rxjs';
import { of } from 'rxjs';

describe('TransferService', () => {
  let service: TransferService;
  let quoteRepositoryMock: any;
  let transferRepositoryMock: any;
  let httpServiceMock: any;
  let configServiceMock: any;
  let dataSourceMock: any;

  beforeEach(async () => {
    quoteRepositoryMock = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    transferRepositoryMock = {
      find: jest.fn(),
    };

    httpServiceMock = {
      get: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue({
        CURRENCY_FRACTION_DIGITS: { USD: 2, JPY: 2 },
        DAY_TRANSFER_LIMIT: { user: 5000 },
        EXCHANGE_RATE_API: 'http://exchange-rate-api',
        QUOTE_EXPIRE_PERIOD: 3600000,
        MAX_DECIMAL_DIGITS: 6,
        TRANSFER_FEES: {
          USD_UNDER_100: { percent: 1, fixed: 10 },
          USD_OVER_100: { percent: 2, fixed: 20 },
          JPY: { percent: 3, fixed: 30 },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: getRepositoryToken(Quote), useValue: quoteRepositoryMock },
        {
          provide: getRepositoryToken(Transfer),
          useValue: transferRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  describe('requestQuote', () => {
    it('should calculate targetAmount with exchangeRates by decimal CURRENCY_FRACTION_DIGITS of target currency', async () => {
      const quoteRequestDto = { amount: 1000, targetCurrency: currency.USD };
      const exchangeRates = { [currency.USD]: 1.2342 } as Record<
        currency,
        number
      >;
      jest.spyOn(service, 'getExchangeRates').mockResolvedValue(exchangeRates);
      jest.spyOn(service, 'calculateFee').mockReturnValue(0);
      await service.requestQuote(1, quoteRequestDto);
      expect(quoteRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          targetAmount: Number(
            (1000 / 1.2342).toFixed(
              configServiceMock.get().CURRENCY_FRACTION_DIGITS[currency.USD],
            ),
          ),
        }),
      );
    });

    it('should calculate usdAmount with exchangeRates by decimal CURRENCY_FRACTION_DIGITS of USD currency', async () => {
      const quoteRequestDto = { amount: 1000, targetCurrency: currency.JPY };
      const exchangeRates = { [currency.JPY]: 110, [currency.USD]: 1.234312 };
      jest.spyOn(service, 'getExchangeRates').mockResolvedValue(exchangeRates);
      jest.spyOn(service, 'calculateFee').mockReturnValue(0);

      await service.requestQuote(1, quoteRequestDto);
      expect(quoteRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usdAmount: Number(
            (1000 / 1.234312).toFixed(
              configServiceMock.get().CURRENCY_FRACTION_DIGITS[currency.USD],
            ),
          ),
        }),
      );
    });

    it('should throw an error when targetAmount is under 0', async () => {
      const quoteRequestDto = { amount: -10, targetCurrency: currency.JPY };
      const exchangeRates = { [currency.JPY]: 100, [currency.USD]: 1.2 };
      jest.spyOn(service, 'getExchangeRates').mockResolvedValue(exchangeRates);
      jest.spyOn(service, 'calculateFee').mockReturnValue(0);

      await expect(service.requestQuote(1, quoteRequestDto)).rejects.toThrow(
        new HttpException('NEGATIVE_NUMBER', HttpStatus.BAD_REQUEST),
      );
    });
  });
  describe('requestTransfer', () => {
    it('should return HttpStatus.BAD_REQUEST error if cant find quoteId', async () => {
      const transferRequestDto = { quoteId: 'invalid-quote-id' };
      const userIdx = 1;
      quoteRepositoryMock.findOne.mockResolvedValue(null);
      await expect(
        service.requestTransfer(
          userIdx,
          userIdType.BUSINESS_NO,
          transferRequestDto,
        ),
      ).rejects.toThrow(
        new HttpException('UNKNOWN_ERROR', HttpStatus.BAD_REQUEST),
      );
    });

    it('should return unauthorized error if quote userIdx is not match with jwt userIdx', async () => {
      const transferRequestDto = { quoteId: 'quote-id' };
      const userIdx = 1;
      const mockQuote = { userIdx: 2, expireTime: new Date() }; // mockQuote with mismatched userIdx
      quoteRepositoryMock.findOne.mockResolvedValue(mockQuote); // Mock the quote repository to return mockQuote

      await expect(
        service.requestTransfer(
          userIdx,
          userIdType.BUSINESS_NO,
          transferRequestDto,
        ),
      ).rejects.toThrowError(
        new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED),
      );
    });

    it('should return QUOTE_EXPIRED error message when passed quote expire time', async () => {
      const transferRequestDto = { quoteId: 'quote-id' };
      const userIdx = 1;
      const mockQuote = { userIdx, expireTime: new Date(Date.now() - 1000) }; // Expired quote
      quoteRepositoryMock.findOne.mockResolvedValue(mockQuote);

      await expect(
        service.requestTransfer(
          userIdx,
          userIdType.BUSINESS_NO,
          transferRequestDto,
        ),
      ).rejects.toThrowError(
        new HttpException('QUOTE_EXPIRED', HttpStatus.BAD_REQUEST),
      );
    });
  });
  describe('getExchangeRates', () => {
    it('should calculate Exchange Rates correctly', async () => {
      jest.spyOn(httpServiceMock, 'get').mockReturnValue(
        of({
          data: [
            {
              currencyCode: 'USD',
              basePrice: 1200,
              currencyUnit: 1,
            },
            {
              currencyCode: 'JPY',
              basePrice: 9,
              currencyUnit: 1,
            },
          ],
        }),
      );

      const exchangeRates = await service.getExchangeRates();

      expect(exchangeRates[currency.USD]).toBeCloseTo(1200);
      expect(exchangeRates[currency.JPY]).toBeCloseTo(9);
    });

    it('should throw UNKNOWN_ERROR if cannot get exchangeRate from EXCHANGE_RATE_API', async () => {
      jest
        .spyOn(httpServiceMock, 'get')
        .mockReturnValue(throwError(() => new Error('API error')));

      await expect(service.getExchangeRates()).rejects.toThrowError(
        new HttpException('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('getTransferList', () => {
    it('should return a transfer list', async () => {
      const mockTransfers = [
        {
          sourceAmount: 1000,
          fee: 10,
          usdExchangeRate: 1.2,
          usdAmount: 1000,
          targetCurrency: 'USD',
          exchangeRate: 1.5,
          targetAmount: 500,
          requestedDate: new Date(),
        },
      ];

      transferRepositoryMock.find.mockResolvedValue(mockTransfers);

      const result = await service.getTransferList('userId');

      expect(result).toEqual(mockTransfers);
      expect(transferRepositoryMock.find).toHaveBeenCalledWith({
        where: { user: { userId: 'userId' } },
      });
    });
  });
});
