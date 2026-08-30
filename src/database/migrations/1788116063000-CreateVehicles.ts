import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehicles1788116063000 implements MigrationInterface {
  name = 'CreateVehicles1788116063000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plate" character varying(7) NOT NULL,
        "brand" character varying(60) NOT NULL,
        "model" character varying(60) NOT NULL,
        "year" smallint NOT NULL,
        "customer_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vehicles_plate" UNIQUE ("plate"),
        CONSTRAINT "PK_vehicles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_customer_id" ON "vehicles" ("customer_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "vehicles"
      ADD CONSTRAINT "FK_vehicles_customer_id"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_vehicles_customer_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_vehicles_customer_id"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
