import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Account } from './account.entity';
import { CreateAccountParams } from './account.dto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async createAccount(params: CreateAccountParams): Promise<Account> {
    this.logger.debug(`creating account ${params.accountNumber}`);
    const accountExists = await this.accountRepository.findOne({
      where: { accountNumber: params.accountNumber },
    });

    if (accountExists) {
      this.logger.error(`account ${params.accountNumber} already exists`);
      throw new BadRequestException('Account already exists');
    }

    const account = this.accountRepository.create({
      accountNumber: params.accountNumber,
      balance: params.balance,
    });

    await this.accountRepository.save(account);

    this.logger.debug(`account ${params.accountNumber} created`);
    return account;
  }

  async getAccountAndLock(
    accountNumber: number,
    queryRunner: QueryRunner,
  ): Promise<Account> {
    return queryRunner.manager.findOne(Account, {
      lock: { mode: 'for_no_key_update' },
      where: { accountNumber },
    });
  }

  async updateAccountBalance(
    accountNumber: number,
    balance: number,
    queryRunner: QueryRunner,
  ) {
    await queryRunner.manager.update(Account, accountNumber, {
      balance,
    });
  }
}
