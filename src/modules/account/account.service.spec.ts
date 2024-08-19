import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { Repository, QueryRunner } from 'typeorm';
import { Account } from './account.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepository: jest.Mocked<Repository<Account>>;
  let queryRunner: jest.Mocked<QueryRunner>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: getRepositoryToken(Account),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    accountRepository = module.get(getRepositoryToken(Account));
    queryRunner = {
      manager: {
        findOne: jest.fn(),
        update: jest.fn(),
      },
    } as any;
  });

  describe('createAccount', () => {
    it('should create an account', async () => {
      const params = { accountNumber: 123, balance: 1000 };
      const account = new Account();
      account.accountNumber = params.accountNumber;
      account.balance = params.balance;

      accountRepository.findOne.mockResolvedValue(null);
      accountRepository.create.mockReturnValue(account);
      accountRepository.save.mockResolvedValue(account);

      const result = await service.createAccount(params);

      expect(result).toEqual(account);
      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { accountNumber: params.accountNumber },
      });
      expect(accountRepository.create).toHaveBeenCalledWith({
        accountNumber: params.accountNumber,
        balance: params.balance,
      });
      expect(accountRepository.save).toHaveBeenCalledWith(account);
    });

    it('should throw an error if account already exists', async () => {
      const params = { accountNumber: 123, balance: 1000 };
      const existingAccount = new Account();

      accountRepository.findOne.mockResolvedValue(existingAccount);

      await expect(service.createAccount(params)).rejects.toThrow(
        BadRequestException,
      );
      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { accountNumber: params.accountNumber },
      });
      expect(accountRepository.create).not.toHaveBeenCalled();
      expect(accountRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getAccountAndLock', () => {
    it('should return account and lock it', async () => {
      const accountNumber = 123;
      const account = new Account();

      (queryRunner.manager.findOne as any).mockResolvedValue(account);

      const result = await service.getAccountAndLock(
        accountNumber,
        queryRunner,
      );

      expect(result).toEqual(account);
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(Account, {
        lock: { mode: 'for_no_key_update' },
        where: { accountNumber },
      });
    });
  });

  describe('updateAccountBalance', () => {
    it('should update account balance', async () => {
      const accountNumber = 123;
      const balance = 2000;

      (queryRunner.manager.update as any).mockResolvedValue({
        affected: 1,
      } as any);

      await service.updateAccountBalance(accountNumber, balance, queryRunner);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Account,
        accountNumber,
        { balance },
      );
    });
  });
});
