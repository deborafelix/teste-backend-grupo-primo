import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Account } from './account.entity';
import { CreateAccountParams } from './account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async createAccount(params: CreateAccountParams): Promise<Account> {
    const accountExists = await this.accountRepository.findOne({
      where: { accountNumber: params.accountNumber },
    });

    if (accountExists) {
      throw new BadRequestException('Account already exists');
    }

    const account = this.accountRepository.create({
      accountNumber: params.accountNumber,
      balance: params.balance,
    });

    await this.accountRepository.save(account);

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
