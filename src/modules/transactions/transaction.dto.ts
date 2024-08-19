import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { TransactionType } from './transaction.entity';

export class CreateTransactionParams {
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsInt()
  @IsOptional()
  from: number;

  @IsInt()
  @IsOptional()
  to: number;

  @IsInt()
  @IsNotEmpty()
  value: number;

  @IsInt()
  @IsOptional()
  account: number;
}
