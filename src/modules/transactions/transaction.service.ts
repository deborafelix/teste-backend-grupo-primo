import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { DataSource, QueryRunner } from 'typeorm';
import {
  Transaction,
  TransactionKind,
  TransactionType,
} from './transaction.entity';
import { CreateTransactionParams } from './transaction.dto';
import { AccountService } from '../account/account.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  constructor(
    private dataSource: DataSource,
    private accountService: AccountService,
  ) {}

  async createTransaction(
    params: CreateTransactionParams,
  ): Promise<Transaction[]> {
    this.logger.debug(
      `creating transaction ${params.type} for ${params.account || params.from}`,
    );
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let transactions = [];
      switch (params.type) {
        case TransactionType.TRANSFERENCIA:
          transactions = await this.createP2P(params, queryRunner);
          break;
        case TransactionType.DEPOSITO:
          transactions = await this.createDeposit(params, queryRunner);
          break;
        case TransactionType.SAQUE:
          transactions = await this.createWithdrawal(params, queryRunner);
          break;
      }
      await queryRunner.commitTransaction();
      this.logger.debug(
        `created transaction ${params.type} for ${params.account || params.from}`,
      );
      return transactions;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `error on create transaction ${params.type} for ${params.account || params.from} with error: ${err.message}`,
        err.stack,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async orderLock(from: number, to: number, queryRunner: QueryRunner) {
    const accountsToLock = [to, from].sort();

    const account1 = await this.accountService.getAccountAndLock(
      accountsToLock[0],
      queryRunner,
    );

    if (!account1) {
      throw new BadRequestException(
        `account number ${accountsToLock[0]} does not exist`,
      );
    }

    const account2 = await this.accountService.getAccountAndLock(
      accountsToLock[1],
      queryRunner,
    );

    if (!account2) {
      throw new BadRequestException(
        `account number ${accountsToLock[1]} does not exist`,
      );
    }

    if (account1.accountNumber === from) {
      return [account1, account2];
    }
    return [account2, account1];
  }

  async createP2P(
    params: CreateTransactionParams,
    queryRunner: QueryRunner,
  ): Promise<Transaction[]> {
    if (!params.from || !params.to) {
      throw new BadRequestException(
        'for this type of transaction from and to must be provided',
      );
    }

    const [fromAccount, toAccount] = await this.orderLock(
      params.from,
      params.to,
      queryRunner,
    );

    if (fromAccount.balance < params.value) {
      throw new BadRequestException('insufficient balance');
    }

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
    await this.accountService.updateAccountBalance(
      fromAccount.accountNumber,
      fromAccount.balance - params.value,
      queryRunner,
    );
    await this.accountService.updateAccountBalance(
      toAccount.accountNumber,
      toAccount.balance + params.value,
      queryRunner,
    );

    return [debitTransaction, creditTransaction];
  }

  async createWithdrawal(
    params: CreateTransactionParams,
    queryRunner: QueryRunner,
  ): Promise<Transaction[]> {
    if (!params.account) {
      throw new BadRequestException(
        'for this type of transaction account must be provided',
      );
    }

    const account = await this.accountService.getAccountAndLock(
      params.account,
      queryRunner,
    );

    if (!account) {
      throw new BadRequestException('account does not exist');
    }

    if (account.balance < params.value) {
      throw new BadRequestException('insufficient balance');
    }

    const debitTransaction = queryRunner.manager.create(Transaction, {
      account: account.accountNumber,
      value: params.value,
      kind: TransactionKind.DEBITO,
      type: TransactionType.SAQUE,
    });

    await queryRunner.manager.save(Transaction, debitTransaction);
    await this.accountService.updateAccountBalance(
      account.accountNumber,
      account.balance - params.value,
      queryRunner,
    );

    return [debitTransaction];
  }

  async createDeposit(
    params: CreateTransactionParams,
    queryRunner: QueryRunner,
  ): Promise<Transaction[]> {
    if (!params.account) {
      throw new BadRequestException(
        'for this type of transaction account must be provided',
      );
    }

    const account = await this.accountService.getAccountAndLock(
      params.account,
      queryRunner,
    );

    if (!account) {
      throw new BadRequestException('account does not exist');
    }

    const creditTransaction = queryRunner.manager.create(Transaction, {
      account: account.accountNumber,
      value: params.value,
      kind: TransactionKind.CREDITO,
      type: TransactionType.DEPOSITO,
    });

    await queryRunner.manager.save(Transaction, creditTransaction);
    await this.accountService.updateAccountBalance(
      account.accountNumber,
      account.balance + params.value,
      queryRunner,
    );

    return [creditTransaction];
  }
}
