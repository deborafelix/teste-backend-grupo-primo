import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Account } from '../account/account.entity';

@Module({
  controllers: [TransactionController],
  exports: [TransactionService],
  providers: [TransactionService],
  imports: [TypeOrmModule.forFeature([Account, Transaction])],
})
export class TransactionModule {}
