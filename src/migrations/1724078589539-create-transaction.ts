import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransaction1724078589539 implements MigrationInterface {
  name = 'CreateTransaction1724078589539';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transaction" ("id" SERIAL NOT NULL, "account" integer NOT NULL, "type" character varying NOT NULL, "value" integer NOT NULL, "kind" character varying NOT NULL, "from" integer, "to" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transaction"`);
  }
}
