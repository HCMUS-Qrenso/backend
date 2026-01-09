/*
  Warnings:

  - Made the column `order_id` on table `reviews` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_order_id_fkey";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "review_type" VARCHAR(20) NOT NULL DEFAULT 'item',
ALTER COLUMN "menu_item_id" DROP NOT NULL,
ALTER COLUMN "order_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "reviews_review_type_idx" ON "reviews"("review_type");

-- CreateIndex
CREATE INDEX "reviews_order_id_review_type_idx" ON "reviews"("order_id", "review_type");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
