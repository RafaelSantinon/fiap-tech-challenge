import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockReservationToCatalog1788129183472 implements MigrationInterface {
  name = 'AddStockReservationToCatalog1788129183472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parts" ADD "reserved_quantity" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplies" ADD "reserved_quantity" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplies" DROP COLUMN "reserved_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parts" DROP COLUMN "reserved_quantity"`,
    );
  }
}
