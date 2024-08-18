import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class Account {
  @PrimaryColumn({
    name: 'account_number',
  })
  accountNumber: number;

  @Column()
  balance: number;
}
