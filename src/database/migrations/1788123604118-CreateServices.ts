import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServices1788123604118 implements MigrationInterface {
  name = 'CreateServices1788123604118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "description" character varying(255),
        "price" numeric(10,2) NOT NULL,
        "estimated_minutes" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_services_name" UNIQUE ("name"),
        CONSTRAINT "PK_services_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "services"`);
  }
}
