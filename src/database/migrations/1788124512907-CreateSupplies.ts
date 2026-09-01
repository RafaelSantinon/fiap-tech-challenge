import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplies1788124512907 implements MigrationInterface {
  name = 'CreateSupplies1788124512907';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "supplies_unit_enum" AS ENUM('un', 'l', 'ml', 'kg', 'g')`,
    );
    await queryRunner.query(`
      CREATE TABLE "supplies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(30) NOT NULL,
        "name" character varying(120) NOT NULL,
        "description" character varying(255),
        "unit" "supplies_unit_enum" NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "stock_quantity" integer NOT NULL DEFAULT 0,
        "minimum_stock" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_supplies_code" UNIQUE ("code"),
        CONSTRAINT "PK_supplies_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "supplies"`);
    await queryRunner.query(`DROP TYPE "supplies_unit_enum"`);
  }
}
