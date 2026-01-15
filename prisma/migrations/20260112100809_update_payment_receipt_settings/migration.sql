/*
  Warnings:

  - You are about to drop the column `receipt_show_logo` on the `tenants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoice_num]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "invoice_num" VARCHAR(50);

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "receipt_show_logo";

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_num_key" ON "payments"("invoice_num");

-- CreateIndex
CREATE INDEX "payments_invoice_num_idx" ON "payments"("invoice_num");
