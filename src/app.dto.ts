import { IsArray, ValidateNested } from 'class-validator';
import { CreateTransactionParams } from './modules/transactions/transaction.dto';
import { CreateAccountParams } from './modules/account/account.dto';
import { Type } from 'class-transformer';
import { Account } from './modules/account/account.entity';
import { Transaction } from './modules/transactions/transaction.entity';

export class MakeOperationsParams {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAccountParams)
  accounts: CreateAccountParams[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionParams)
  transactions: CreateTransactionParams[];
}

export class MakeOperationsResponse {
  accounts: Account[];
  transactions: Transaction[];
  errors: string[];
}
