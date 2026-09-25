export const schemaStatements = [
  `DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('admin', 'candidate');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "SeniorityLevel" AS ENUM ('junior', 'middle', 'senior');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
  );`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'candidate';`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMP(3);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" TIMESTAMP(3);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pending_email" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_change_token_hash" TEXT;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_change_expires_at" TIMESTAMP(3);`,
  `UPDATE "users" SET "email_verified" = true WHERE "email_verification_token_hash" IS NULL AND "pending_email" IS NULL;`,
  `CREATE TABLE IF NOT EXISTS "vacancies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" "SeniorityLevel" NOT NULL,
    "skills" TEXT[] NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quiz_questions" JSONB,
    "bot_questions" JSONB,
    "coding_task" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");`,
  `CREATE INDEX IF NOT EXISTS "vacancies_user_id_created_at_idx" ON "vacancies"("user_id", "created_at" DESC);`,
  `DO $$ BEGIN
    ALTER TABLE "vacancies"
      ADD CONSTRAINT "vacancies_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
]
