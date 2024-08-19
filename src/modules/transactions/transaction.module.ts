import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  controllers: [TransactionController],
  exports: [TransactionService],
  providers: [TransactionService],
  imports: [TypeOrmModule.forFeature([Transaction])],
})
export class AccountModule {}
