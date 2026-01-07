-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "created_by_customer_id" UUID,
ADD COLUMN     "created_by_device_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_status" VARCHAR(20) NOT NULL DEFAULT 'none';
