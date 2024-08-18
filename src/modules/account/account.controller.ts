import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountParams } from './account.dto';
import { Account } from './account.entity';
import { ApiTags } from '@nestjs/swagger';

@Controller('/account')
@ApiTags('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(201)
  createAccount(@Body() params: CreateAccountParams): Promise<Account> {
    return this.accountService.createAccount(params);
  }
}
