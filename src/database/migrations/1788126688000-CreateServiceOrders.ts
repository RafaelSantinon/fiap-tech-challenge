import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceOrders1788126688000 implements MigrationInterface {
  name = 'CreateServiceOrders1788126688000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "service_orders_status_enum" AS ENUM('received', 'in_diagnosis', 'awaiting_approval', 'in_progress', 'finished', 'delivered')`,
    );
    await queryRunner.query(`CREATE SEQUENCE "service_orders_number_seq"`);
    await queryRunner.query(`
      CREATE TABLE "service_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "number" character varying(20) NOT NULL DEFAULT ('OS-' || lpad(nextval('service_orders_number_seq')::text, 6, '0')),
        "customer_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "status" "service_orders_status_enum" NOT NULL DEFAULT 'received',
        "description" character varying(255),
        "status_durations" jsonb NOT NULL DEFAULT '{}',
        "status_changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_service_orders_number" UNIQUE ("number"),
        CONSTRAINT "PK_service_orders_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER SEQUENCE "service_orders_number_seq" OWNED BY "service_orders"."number"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_customer_id" ON "service_orders" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_vehicle_id" ON "service_orders" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_service_orders_status" ON "service_orders" ("status")`,
    );
    await queryRunner.query(`
      ALTER TABLE "service_orders"
      ADD CONSTRAINT "FK_service_orders_customer_id"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "service_orders"
      ADD CONSTRAINT "FK_service_orders_vehicle_id"
      FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_vehicle_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_service_orders_customer_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_service_orders_status"`);
    await queryRunner.query(`DROP INDEX "IDX_service_orders_vehicle_id"`);
    await queryRunner.query(`DROP INDEX "IDX_service_orders_customer_id"`);
    await queryRunner.query(`DROP TABLE "service_orders"`);
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "service_orders_number_seq"`,
    );
    await queryRunner.query(`DROP TYPE "service_orders_status_enum"`);
  }
}
