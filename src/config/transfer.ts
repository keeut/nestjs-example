import { ConfigService } from '@nestjs/config';
import { currency } from '../transfer/entities/transfer-constant';
import { userIdType } from '../user/entities/user-constant';

// Transfer Fees Configuration
export const getTransferFeesConfig = (configService: ConfigService) => ({
  USD_UNDER_100: {
    fixed: Number(configService.get<number>('FEE_USD_UNDER_100_FIXED', 1000)),
    percent: Number(
      configService.get<number>('FEE_USD_UNDER_100_PERCENT', 0.2),
    ),
  },
  USD_OVER_100: {
    fixed: Number(configService.get<number>('FEE_USD_OVER_100_FIXED', 3000)),
    percent: Number(configService.get<number>('FEE_USD_OVER_100_PERCENT', 0.1)),
  },
  JPY: {
    fixed: Number(configService.get<number>('FEE_JPY_FIXED', 3000)),
    percent: Number(configService.get<number>('FEE_JPY_PERCENT', 0.5)),
  },
});

// Other Configurations
export const getTransferConfigs = (configService: ConfigService) => ({
  MAX_DECIMAL_DIGITS: Number(
    configService.get<number>('MAX_DECIMAL_DIGITS', 12),
  ),
  CURRENCY_FRACTION_DIGITS: {
    USD: 2,
    JPY: 0,
  } as Record<currency, number>,
  DAY_TRANSFER_LIMIT: {
    REG_NO: Number(
      configService.get<number>('DAY_TRANSFER_LIMIT_REG_NO', 1000),
    ),
    BUSINESS_NO: Number(
      configService.get<number>('DAY_TRANSFER_LIMIT_BUSINESS_NO', 5000),
    ),
  } as Record<userIdType, number>,
  EXCHANGE_RATE_API: configService.get<string>(
    'EXCHANGE_RATE_API',
    'https://crix-api-cdn.upbit.com/v1/forex/recent?codes=,FRX.KRWJPY,FRX.KRWUSD',
  ),
  QUOTE_EXPIRE_PERIOD: Number(
    configService.get<number>('QUOTE_EXPIRE_PERIOD', 1000 * 60 * 10),
  ),
});
