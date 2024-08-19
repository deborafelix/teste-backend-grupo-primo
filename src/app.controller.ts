import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { MakeOperationsParams, MakeOperationsResponse } from './app.dto';

@Controller('/')
@ApiTags('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus(): string {
    return this.appService.getStatus();
  }

  @Post()
  async makeOperations(
    @Body() params: MakeOperationsParams,
  ): Promise<MakeOperationsResponse> {
    return this.appService.makeOperations(params);
  }
}
