import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';

@Module({
  controllers: [AccountController],
  exports: [AccountService],
  providers: [AccountService],
  imports: [TypeOrmModule.forFeature([Account])],
})
export class AccountModule {}
