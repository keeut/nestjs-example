import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { QuoteRequestDto } from './dto/quote-request';
import { TransferRequestDto } from './dto/transfer-request';
import { currency } from './entities/transfer-constant';
import { Quote } from './entities/quote.entity';
import { userIdType } from 'src/user/entities/user-constant';

describe('TransferController', () => {
  let controller: TransferController;
  let service: TransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferService,
          useValue: {
            requestQuote: jest.fn(),
            requestTransfer: jest.fn(),
            getTransferList: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransferController>(TransferController);
    service = module.get<TransferService>(TransferService);
  });

  describe('requestQuote', () => {
    it('should return quote data', async () => {
      const quoteRequestDto: QuoteRequestDto = {
        amount: 1000,
        targetCurrency: currency.JPY,
      };
      const mockQuote: Quote = {
        quoteId: '123',
        exchangeRate: 1.5,
        expireTime: new Date(),
        targetAmount: 1000,
        amount: 1000,
        targetCurrency: currency.JPY,
        fee: 0,
        usdAmount: 0,
        usdExchangeRate: 0,
        userIdx: 1,
      } as Quote;
      jest.spyOn(service, 'requestQuote').mockResolvedValue(mockQuote);

      const req = { user: { idx: 1, userId: 'testUser' } };
      const result = await controller.requestQuote(req, quoteRequestDto);

      expect(result).toEqual({
        quote: {
          quoteId: mockQuote.quoteId,
          exchangeRate: mockQuote.exchangeRate,
          expireTime: mockQuote.expireTime,
          targetAmount: mockQuote.targetAmount,
        },
      });
      expect(service.requestQuote).toHaveBeenCalledWith(1, quoteRequestDto);
    });
  });

  describe('requestTransfer', () => {
    it('should call requestTransfer method', async () => {
      const transferRequestDto: TransferRequestDto = {
        quoteId: '123',
      };
      const req = { user: { idx: 1, userId: 'testUser', idType: 'someId' } };

      await controller.requestTransfer(req, transferRequestDto);

      expect(service.requestTransfer).toHaveBeenCalledWith(
        1,
        'someId',
        transferRequestDto,
      );
    });
  });

  describe('getTransferList', () => {
    it('should return transfer list data', async () => {
      const mockHistory = [
        {
          sourceAmount: 1000,
          fee: 10,
          usdExchangeRate: 1.1,
          usdAmount: 1100,
          targetCurrency: 'USD',
          exchangeRate: 1.2,
          targetAmount: 1200,
          requestedDate: new Date(),
        },
      ] as any;
      jest.spyOn(service, 'getTransferList').mockResolvedValue(mockHistory);

      const req = { user: { userId: 'testUser', name: 'John Doe' } };
      const result = await controller.getTransferList(req);

      expect(result).toEqual({
        userId: 'testUser',
        name: 'John Doe',
        todaytransferCount: 1,
        todayTransferUsdAmount: 1100,
        history: expect.any(Array),
      });
      expect(service.getTransferList).toHaveBeenCalledWith('testUser');
    });
  });
});
