import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Transaction,
  TransactionKind,
  TransactionType,
} from './transaction.entity';
import { CreateTransactionParams } from './transaction.dto';
import { Account } from '../account/account.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private dataSource: DataSource,
  ) {}

  async createTransaction(
    params: CreateTransactionParams,
  ): Promise<Transaction[]> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const fromAccount = await queryRunner.manager.findOne(Account, {
        lock: { mode: 'for_no_key_update' },
        where: { accountNumber: params.from },
      });

      const toAccount = await queryRunner.manager.findOne(Account, {
        lock: { mode: 'for_no_key_update' },
        where: { accountNumber: params.to },
      });

      if (fromAccount.balance < params.value) {
        throw new BadRequestException('insufficient balance');
      }

      fromAccount.balance -= params.value;
      toAccount.balance += params.value;

      const debitTransaction = queryRunner.manager.create(Transaction, {
        account: fromAccount.accountNumber,
        from: fromAccount.accountNumber,
        to: toAccount.accountNumber,
        value: params.value,
        kind: TransactionKind.DEBITO,
        type: TransactionType.TRANSFERENCIA,
      });

      const creditTransaction = queryRunner.manager.create(Transaction, {
        account: toAccount.accountNumber,
        from: fromAccount.accountNumber,
        to: toAccount.accountNumber,
        value: params.value,
        kind: TransactionKind.CREDITO,
        type: TransactionType.TRANSFERENCIA,
      });

      await queryRunner.manager.save(Transaction, debitTransaction);
      await queryRunner.manager.save(Transaction, creditTransaction);
      await queryRunner.manager.update(Account, fromAccount.accountNumber, {
        balance: fromAccount.balance,
      });
      await queryRunner.manager.update(Account, toAccount.accountNumber, {
        balance: toAccount.balance,
      });

      await queryRunner.commitTransaction();

      return [debitTransaction, creditTransaction];
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
