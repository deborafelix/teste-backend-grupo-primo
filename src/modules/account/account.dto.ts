import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateAccountParams {
  @IsInt()
  @IsNotEmpty()
  accountNumber: number;

  @IsInt()
  @IsNotEmpty()
  balance: number;
}
