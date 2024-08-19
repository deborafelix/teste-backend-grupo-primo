import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { AccountService } from '../account/account.service';
import { DataSource, QueryRunner } from 'typeorm';
import { TransactionKind, TransactionType } from './transaction.entity';
import { CreateTransactionParams } from './transaction.dto';
import { BadRequestException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('TransactionService', () => {
  let service: TransactionService;
  let accountService: jest.Mocked<AccountService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: AccountService,
          useValue: {
            getAccountAndLock: jest.fn(),
            updateAccountBalance: jest.fn(),
          } as any,
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            createQueryRunner: jest.fn(),
          } as any,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    accountService = module.get<AccountService>(AccountService) as any;
    dataSource = module.get<DataSource>(getDataSourceToken()) as any;
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        findOne: jest.fn(),
      },
    } as any;

    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    accountService.updateAccountBalance.mockImplementation(async () => {
      return;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a transfer transaction', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.TRANSFERENCIA,
        from: 1,
        to: 2,
        value: 100,
      };
      const fromAccount = { accountNumber: 1, balance: 200 };
      const toAccount = { accountNumber: 2, balance: 300 };

      accountService.getAccountAndLock.mockResolvedValueOnce(
        fromAccount as any,
      );
      accountService.getAccountAndLock.mockResolvedValueOnce(toAccount as any);

      const debitTransaction = {
        id: 1,
        ...params,
        kind: TransactionKind.DEBITO,
      } as any;
      const creditTransaction = {
        id: 2,
        ...params,
        kind: TransactionKind.CREDITO,
      } as any;

      (queryRunner.manager.create as any).mockReturnValueOnce(debitTransaction);
      (queryRunner.manager.create as any).mockReturnValueOnce(
        creditTransaction,
      );
      (queryRunner.manager.save as any).mockResolvedValueOnce(debitTransaction);
      (queryRunner.manager.save as any).mockResolvedValueOnce(
        creditTransaction,
      );

      const result = await service.createTransaction(params);

      expect(result).toEqual([debitTransaction, creditTransaction]);
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(accountService.getAccountAndLock).toHaveBeenCalledTimes(2);
      expect(accountService.updateAccountBalance).toHaveBeenCalledTimes(2);
    });

    it('should rollback transaction on error', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.TRANSFERENCIA,
        from: 1,
        to: 2,
        value: 100,
      };

      accountService.getAccountAndLock.mockRejectedValue(
        new Error('Some error') as any,
      );

      await expect(service.createTransaction(params)).rejects.toThrow(
        'Some error',
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('orderLock', () => {
    it('should lock accounts in correct order', async () => {
      const fromAccount = { accountNumber: 1 } as any;
      const toAccount = { accountNumber: 2 } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(
        fromAccount as any,
      );
      accountService.getAccountAndLock.mockResolvedValueOnce(toAccount as any);

      const result = await service.orderLock(1, 2, queryRunner);

      expect(result).toEqual([fromAccount, toAccount]);
      expect(accountService.getAccountAndLock).toHaveBeenCalledTimes(2);
    });

    it('should throw error if account does not exist', async () => {
      accountService.getAccountAndLock.mockResolvedValueOnce(null as any);

      await expect(service.orderLock(1, 2, queryRunner)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountService.getAccountAndLock).toHaveBeenCalledTimes(1);
    });
  });

  describe('createP2P', () => {
    it('should create a P2P transaction successfully', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.TRANSFERENCIA,
        from: 1,
        to: 2,
        value: 100,
      };
      const fromAccount = { accountNumber: 1, balance: 200 } as any;
      const toAccount = { accountNumber: 2, balance: 300 } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(
        fromAccount as any,
      );
      accountService.getAccountAndLock.mockResolvedValueOnce(toAccount as any);

      const debitTransaction = {
        id: 1,
        ...params,
        kind: TransactionKind.DEBITO,
      } as any;
      const creditTransaction = {
        id: 2,
        ...params,
        kind: TransactionKind.CREDITO,
      } as any;

      (queryRunner.manager.create as any).mockReturnValueOnce(debitTransaction);
      (queryRunner.manager.create as any).mockReturnValueOnce(
        creditTransaction,
      );
      (queryRunner.manager.save as any).mockResolvedValueOnce(debitTransaction);
      (queryRunner.manager.save as any).mockResolvedValueOnce(
        creditTransaction,
      );

      const result = await service.createP2P(params, queryRunner);
      expect(result).toEqual([debitTransaction, creditTransaction]);
      expect(accountService.getAccountAndLock).toHaveBeenCalledTimes(2);
      expect(accountService.updateAccountBalance).toHaveBeenCalledWith(
        fromAccount.accountNumber,
        fromAccount.balance - params.value,
        queryRunner,
      );
      expect(accountService.updateAccountBalance).toHaveBeenCalledWith(
        toAccount.accountNumber,
        toAccount.balance + params.value,
        queryRunner,
      );
    });

    it('should throw error if from or to accounts are missing', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.TRANSFERENCIA,
        value: 100,
      } as any;

      await expect(service.createP2P(params, queryRunner)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountService.getAccountAndLock).not.toHaveBeenCalled();
    });

    it('should throw error if insufficient balance', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.TRANSFERENCIA,
        from: 1,
        to: 2,
        value: 300,
      };
      const fromAccount = { accountNumber: 1, balance: 200 } as any;
      const toAccount = { accountNumber: 2, balance: 300 } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(
        fromAccount as any,
      );
      accountService.getAccountAndLock.mockResolvedValueOnce(toAccount as any);

      await expect(service.createP2P(params, queryRunner)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountService.getAccountAndLock).toHaveBeenCalledTimes(2);
    });
  });

  describe('createWithdrawal', () => {
    it('should create a withdrawal transaction successfully', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.SAQUE,
        account: 1,
        value: 100,
      };
      const account = { accountNumber: 1, balance: 200 } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(account as any);

      const debitTransaction = {
        id: 1,
        ...params,
        kind: TransactionKind.DEBITO,
      } as any;

      (queryRunner.manager as any).create.mockReturnValueOnce(debitTransaction);
      (queryRunner.manager as any).save.mockResolvedValueOnce(debitTransaction);

      const result = await service.createWithdrawal(params, queryRunner);

      expect(result).toEqual([debitTransaction]);
      expect(accountService.getAccountAndLock).toHaveBeenCalledWith(
        params.account,
        queryRunner,
      );
      expect(accountService.updateAccountBalance).toHaveBeenCalledWith(
        account.accountNumber,
        account.balance - params.value,
        queryRunner,
      );
    });

    it('should throw error if account is missing', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.SAQUE,
        value: 100,
      } as any;

      await expect(
        service.createWithdrawal(params, queryRunner),
      ).rejects.toThrow(BadRequestException);
      expect(accountService.getAccountAndLock).not.toHaveBeenCalled();
    });

    it('should throw error if insufficient balance', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.SAQUE,
        account: 1,
        value: 300,
      };
      const account = { accountNumber: 1, balance: 200 } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(account as any);

      await expect(
        service.createWithdrawal(params, queryRunner),
      ).rejects.toThrow(BadRequestException);
      expect(accountService.getAccountAndLock).toHaveBeenCalledWith(
        params.account,
        queryRunner,
      );
    });
  });

  describe('createDeposit', () => {
    it('should create a deposit transaction successfully', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.DEPOSITO,
        account: 1,
        value: 100,
      };
      const balance = 200;
      const account = { accountNumber: 1, balance } as any;

      accountService.getAccountAndLock.mockResolvedValueOnce(account as any);

      const creditTransaction = {
        id: 1,
        ...params,
        kind: TransactionKind.CREDITO,
      } as any;

      (queryRunner.manager.create as any).mockReturnValueOnce(
        creditTransaction,
      );
      (queryRunner.manager.save as any).mockResolvedValueOnce(
        creditTransaction,
      );

      const result = await service.createDeposit(params, queryRunner);

      expect(result).toEqual([creditTransaction]);
      expect(accountService.getAccountAndLock).toHaveBeenCalledWith(
        params.account,
        queryRunner,
      );
      expect(accountService.updateAccountBalance).toHaveBeenCalledWith(
        account.accountNumber,
        account.balance + params.value,
        queryRunner,
      );
    });

    it('should throw error if account is missing', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.DEPOSITO,
        value: 100,
      } as any;

      await expect(service.createDeposit(params, queryRunner)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountService.getAccountAndLock).not.toHaveBeenCalled();
    });

    it('should throw error if account does not exist', async () => {
      const params: CreateTransactionParams = {
        type: TransactionType.DEPOSITO,
        account: 1,
        value: 100,
      };

      accountService.getAccountAndLock.mockResolvedValueOnce(null as any);

      await expect(service.createDeposit(params, queryRunner)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountService.getAccountAndLock).toHaveBeenCalledWith(
        params.account,
        queryRunner,
      );
    });
  });
});
