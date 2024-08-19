import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum TransactionType {
  SAQUE = 'saque',
  DEPOSITO = 'deposito',
  TRANSFERENCIA = 'transferencia',
}

export enum TransactionKind {
  CREDITO = 'credito',
  DEBITO = 'debito',
}

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account: number;

  @Column()
  type: TransactionType;

  @Column()
  value: number;

  @Column()
  kind: TransactionKind;

  @Column({ nullable: true })
  from?: number;

  @Column({ nullable: true })
  to?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
