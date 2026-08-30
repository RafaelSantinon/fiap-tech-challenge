import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTokens1788109121000 implements MigrationInterface {
  name = 'CreateUsersTokens1788109121000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "refresh_token_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_tokens_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_tokens_user_id" ON "users_tokens" ("user_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "users_tokens"
      ADD CONSTRAINT "FK_users_tokens_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users_tokens" DROP CONSTRAINT "FK_users_tokens_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_users_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "users_tokens"`);
  }
}
