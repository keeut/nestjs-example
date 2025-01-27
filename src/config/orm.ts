import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: configService.get<'mysql' | 'postgres'>('DB_TYPE', 'mysql'),
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'test'),
  password: configService.get<string>('DB_PASSWORD', 'test'),
  database: configService.get<string>('DB_NAME', 'test'),
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
  logging: configService.get<string>('NODE_ENV') !== 'production',
  poolSize: configService.get<number>('DB_POOL_SIZE', 20),
  autoLoadEntities: true, 
  timezone: "Z"
});