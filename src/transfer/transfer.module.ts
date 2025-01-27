import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quote } from './entities/quote.entity';
import { Transfer } from './entities/transfer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, Transfer]), HttpModule],
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}
