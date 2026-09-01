import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomers1788115738492 implements MigrationInterface {
  name = 'CreateCustomers1788115738492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "customers_document_type_enum" AS ENUM('cpf', 'cnpj')`,
    );
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(150) NOT NULL,
        "document" character varying(14) NOT NULL,
        "document_type" "customers_document_type_enum" NOT NULL,
        "email" character varying(180) NOT NULL,
        "phone" character varying(20),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customers_document" UNIQUE ("document"),
        CONSTRAINT "PK_customers_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TYPE "customers_document_type_enum"`);
  }
}
