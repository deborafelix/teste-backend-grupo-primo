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
    switch (params.type) {
      case TransactionType.TRANSFERENCIA:
        return this.createP2P(params);
      case TransactionType.DEPOSITO:
        return this.createDeposit(params);
      case TransactionType.SAQUE:
        return this.createWithdrawal(params);
    }
  }

  async createP2P(params: CreateTransactionParams): Promise<Transaction[]> {
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
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createWithdrawal(
    params: CreateTransactionParams,
  ): Promise<Transaction[]> {
    if (!params.account) {
      throw new BadRequestException(
        'for this type of transaction account must be provided',
      );
    }
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const account = await queryRunner.manager.findOne(Account, {
        lock: { mode: 'for_no_key_update' },
        where: { accountNumber: params.account },
      });

      if (account.balance < params.value) {
        throw new BadRequestException('insufficient balance');
      }

      account.balance -= params.value;

      const debitTransaction = queryRunner.manager.create(Transaction, {
        account: account.accountNumber,
        value: params.value,
        kind: TransactionKind.DEBITO,
        type: TransactionType.SAQUE,
      });

      await queryRunner.manager.save(Transaction, debitTransaction);
      await queryRunner.manager.update(Account, account.accountNumber, {
        balance: account.balance,
      });

      await queryRunner.commitTransaction();

      return [debitTransaction];
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createDeposit(params: CreateTransactionParams): Promise<Transaction[]> {
    if (!params.account) {
      throw new BadRequestException(
        'for this type of transaction account must be provided',
      );
    }
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const account = await queryRunner.manager.findOne(Account, {
        lock: { mode: 'for_no_key_update' },
        where: { accountNumber: params.account },
      });

      account.balance += params.value;

      const creditTransaction = queryRunner.manager.create(Transaction, {
        account: account.accountNumber,
        value: params.value,
        kind: TransactionKind.CREDITO,
        type: TransactionType.DEPOSITO,
      });

      await queryRunner.manager.save(Transaction, creditTransaction);
      await queryRunner.manager.update(Account, account.accountNumber, {
        balance: account.balance,
      });

      await queryRunner.commitTransaction();

      return [creditTransaction];
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
