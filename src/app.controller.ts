import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateAccountParams } from './dto/app.input';
import { Account } from './account.entity';

@Controller('/account')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @HttpCode(201)
  createAccount(@Body() params: CreateAccountParams): Promise<Account> {
    return this.appService.createAccount(params);
  }
}
