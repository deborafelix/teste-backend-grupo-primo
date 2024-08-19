import { Injectable } from '@nestjs/common';
import { MakeOperationsParams, MakeOperationsResponse } from './app.dto';
import { TransactionService } from './modules/transactions/transaction.service';
import { AccountService } from './modules/account/account.service';
@Injectable()
export class AppService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly accountService: AccountService,
  ) {}

  getStatus(): string {
    return 'Ok';
  }

  async makeOperations(
    params: MakeOperationsParams,
  ): Promise<MakeOperationsResponse> {
    const errors = [];
    let accounts = [];
    if (params.accounts.length > 0) {
      const accountsPromise = params.accounts.map(async (account) => {
        try {
          return await this.accountService.createAccount(account);
        } catch (err) {
          errors.push(`Account ${account.accountNumber} - ${err.message}`);
        }
      });
      accounts = (await Promise.all(accountsPromise)).filter((item) => !!item);
    }

    const transactions = [];
    if (params.transactions.length > 0) {
      for (let i = 0; i < params.transactions.length; i++) {
        try {
          const transaction = await this.transactionService.createTransaction(
            params.transactions[i],
          );
          transactions.push(transaction);
        } catch (err) {
          errors.push(`Transaction in index ${i} - ${err.message}`);
        }
      }
    }

    return { accounts, transactions, errors };
  }
}
