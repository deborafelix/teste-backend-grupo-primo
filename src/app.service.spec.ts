import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { AccountService } from './modules/account/account.service';
import { TransactionService } from './modules/transactions/transaction.service';
import { MakeOperationsParams, MakeOperationsResponse } from './app.dto';

describe('AppService', () => {
  let appService: AppService;
  let accountService: jest.Mocked<AccountService>;
  let transactionService: jest.Mocked<TransactionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: AccountService,
          useValue: {
            createAccount: jest.fn(),
          } as any,
        },
        {
          provide: TransactionService,
          useValue: {
            createTransaction: jest.fn(),
          } as any,
        },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
    accountService = module.get<AccountService>(AccountService) as any;
    transactionService = module.get<TransactionService>(
      TransactionService,
    ) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return health check status', () => {
      expect(appService.getStatus()).toBe('Healthcheck ok');
    });
  });

  describe('makeOperations', () => {
    it('should create accounts and transactions successfully', async () => {
      const params: MakeOperationsParams = {
        accounts: [{ accountNumber: 1, balance: 1000 }],
        transactions: [{ type: 'DEPOSITO', account: 1, value: 500 }] as any,
      };

      const createdAccount = { accountNumber: 1, balance: 1000 } as any;
      const createdTransaction = [
        { id: 1, type: 'DEPOSITO', account: 1, value: 500 },
      ] as any;

      accountService.createAccount.mockResolvedValueOnce(createdAccount);
      transactionService.createTransaction.mockResolvedValueOnce(
        createdTransaction,
      );

      const result: MakeOperationsResponse =
        await appService.makeOperations(params);

      expect(result.accounts).toEqual([createdAccount]);
      expect(result.transactions).toEqual([createdTransaction]);
      expect(result.errors).toEqual([]);
      expect(accountService.createAccount).toHaveBeenCalledTimes(1);
      expect(transactionService.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during account creation', async () => {
      const params: MakeOperationsParams = {
        accounts: [{ accountNumber: 1, balance: 1000 }],
        transactions: [],
      };

      accountService.createAccount.mockRejectedValueOnce(
        new Error('Account creation failed'),
      );

      const result: MakeOperationsResponse =
        await appService.makeOperations(params);

      expect(result.accounts).toEqual([]);
      expect(result.transactions).toEqual([]);
      expect(result.errors).toEqual(['Account 1 - Account creation failed']);
      expect(accountService.createAccount).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during transaction creation', async () => {
      const params: MakeOperationsParams = {
        accounts: [],
        transactions: [{ type: 'DEPOSITO', account: 1, value: 500 }] as any,
      };

      transactionService.createTransaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      const result: MakeOperationsResponse =
        await appService.makeOperations(params);

      expect(result.accounts).toEqual([]);
      expect(result.transactions).toEqual([]);
      expect(result.errors).toEqual([
        'Transaction in index 0 - Transaction failed',
      ]);
      expect(transactionService.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create multiple accounts and transactions and handle multiple errors', async () => {
      const params: MakeOperationsParams = {
        accounts: [
          { accountNumber: 1, balance: 1000 },
          { accountNumber: 2, balance: 2000 },
        ],
        transactions: [
          { type: 'DEPOSITO', account: 1, value: 500 } as any,
          { type: 'SAQUE', account: 2, value: 1000 } as any,
        ],
      };

      const createdAccount1 = { accountNumber: 1, balance: 1000 } as any;
      const createdTransaction1 = [
        { id: 1, type: 'DEPOSITO', account: 1, value: 500 },
      ] as any;

      accountService.createAccount
        .mockResolvedValueOnce(createdAccount1)
        .mockRejectedValueOnce(new Error('Account creation failed'));

      transactionService.createTransaction
        .mockResolvedValueOnce(createdTransaction1)
        .mockRejectedValueOnce(new Error('Transaction failed'));

      const result: MakeOperationsResponse =
        await appService.makeOperations(params);

      expect(result.accounts).toEqual([createdAccount1]);
      expect(result.transactions).toEqual([createdTransaction1]);
      expect(result.errors).toEqual([
        'Account 2 - Account creation failed',
        'Transaction in index 1 - Transaction failed',
      ]);
      expect(accountService.createAccount).toHaveBeenCalledTimes(2);
      expect(transactionService.createTransaction).toHaveBeenCalledTimes(2);
    });
  });
});
