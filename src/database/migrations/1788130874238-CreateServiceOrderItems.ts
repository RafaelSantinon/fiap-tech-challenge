import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceOrderItems1788130874238 implements MigrationInterface {
  name = 'CreateServiceOrderItems1788130874238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "service_order_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "service_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_service_order_services_item" UNIQUE ("service_order_id", "service_id"),
        CONSTRAINT "PK_service_order_services_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_services_service_order_id" ON "service_order_services" ("service_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_services_service_id" ON "service_order_services" ("service_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "service_order_services"
      ADD CONSTRAINT "FK_service_order_services_service_order_id"
      FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order_services"
      ADD CONSTRAINT "FK_service_order_services_service_id"
      FOREIGN KEY ("service_id") REFERENCES "services"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "service_order_parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_service_order_parts_item" UNIQUE ("service_order_id", "part_id"),
        CONSTRAINT "PK_service_order_parts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_parts_service_order_id" ON "service_order_parts" ("service_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_parts_part_id" ON "service_order_parts" ("part_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "service_order_parts"
      ADD CONSTRAINT "FK_service_order_parts_service_order_id"
      FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order_parts"
      ADD CONSTRAINT "FK_service_order_parts_part_id"
      FOREIGN KEY ("part_id") REFERENCES "parts"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "service_order_supplies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "service_order_id" uuid NOT NULL,
        "supply_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_price" numeric(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_service_order_supplies_item" UNIQUE ("service_order_id", "supply_id"),
        CONSTRAINT "PK_service_order_supplies_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_supplies_service_order_id" ON "service_order_supplies" ("service_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_order_supplies_supply_id" ON "service_order_supplies" ("supply_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "service_order_supplies"
      ADD CONSTRAINT "FK_service_order_supplies_service_order_id"
      FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "service_order_supplies"
      ADD CONSTRAINT "FK_service_order_supplies_supply_id"
      FOREIGN KEY ("supply_id") REFERENCES "supplies"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_order_supplies" DROP CONSTRAINT "FK_service_order_supplies_supply_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_order_supplies" DROP CONSTRAINT "FK_service_order_supplies_service_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_service_order_supplies_supply_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_service_order_supplies_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_supplies"`);

    await queryRunner.query(
      `ALTER TABLE "service_order_parts" DROP CONSTRAINT "FK_service_order_parts_part_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_order_parts" DROP CONSTRAINT "FK_service_order_parts_service_order_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_service_order_parts_part_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_service_order_parts_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_parts"`);

    await queryRunner.query(
      `ALTER TABLE "service_order_services" DROP CONSTRAINT "FK_service_order_services_service_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_order_services" DROP CONSTRAINT "FK_service_order_services_service_order_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_service_order_services_service_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_service_order_services_service_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "service_order_services"`);
  }
}
