import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuotes1788131602596 implements MigrationInterface {
  name = 'CreateQuotes1788131602596';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "quotes_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(`
      CREATE TABLE "quotes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "status" "quotes_status_enum" NOT NULL DEFAULT 'pending',
        "services_total" numeric(10,2) NOT NULL,
        "parts_total" numeric(10,2) NOT NULL,
        "supplies_total" numeric(10,2) NOT NULL,
        "total_amount" numeric(10,2) NOT NULL,
        "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
        "responded_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_quotes_service_order_id" UNIQUE ("service_order_id"),
        CONSTRAINT "PK_quotes_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "quotes"
      ADD CONSTRAINT "FK_quotes_service_order_id"
      FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_quotes_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "quotes"`);
    await queryRunner.query(`DROP TYPE "quotes_status_enum"`);
  }
}
