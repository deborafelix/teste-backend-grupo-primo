import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionParams } from './transaction.dto';
import { ApiTags } from '@nestjs/swagger';
import { Transaction } from './transaction.entity';

@Controller('/transaction')
@ApiTags('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @HttpCode(201)
  createTransaction(
    @Body() params: CreateTransactionParams,
  ): Promise<Transaction[]> {
    return this.transactionService.createTransaction(params);
  }
}
