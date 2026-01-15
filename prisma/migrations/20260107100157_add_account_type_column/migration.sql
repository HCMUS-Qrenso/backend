/*
  Warnings:

  - A unique constraint covering the columns `[email,account_type]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_type" VARCHAR(20) NOT NULL DEFAULT 'customer';

-- CreateIndex
CREATE INDEX "users_account_type_idx" ON "users"("account_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_account_type_key" ON "users"("email", "account_type");
