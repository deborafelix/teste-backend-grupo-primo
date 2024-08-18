import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccount1724021120522 implements MigrationInterface {
  name = 'CreateAccount1724021120522';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "account" ("account_number" integer NOT NULL, "balance" integer NOT NULL, CONSTRAINT "PK_c91a92631ee1ccb9f29e599ba42" PRIMARY KEY ("account_number"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "account"`);
  }
}
