import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParts1788124087563 implements MigrationInterface {
  name = 'CreateParts1788124087563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(30) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(255),
        "brand" character varying(60),
        "unit_price" numeric(10,2) NOT NULL,
        "stock_quantity" integer NOT NULL DEFAULT 0,
        "minimum_stock" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_parts_code" UNIQUE ("code"),
        CONSTRAINT "PK_parts_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "parts"`);
  }
}
