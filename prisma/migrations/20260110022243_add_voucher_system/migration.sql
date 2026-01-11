-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "VoucherKind" AS ENUM ('automatic', 'staff_only', 'code');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percent', 'fixed_amount');

-- CreateEnum
CREATE TYPE "ApplySource" AS ENUM ('auto', 'waiter', 'customer_code', 'admin');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'VND';

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "VoucherStatus" NOT NULL DEFAULT 'draft',
    "kind" "VoucherKind" NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "percent_off" DECIMAL(5,2),
    "amount_off" DECIMAL(10,2),
    "max_discount_amount" DECIMAL(10,2),
    "starts_at" TIMESTAMP(6),
    "ends_at" TIMESTAMP(6),
    "min_subtotal" DECIMAL(10,2),
    "min_party" INTEGER,
    "max_redemptions_total" INTEGER,
    "max_redemptions_per_customer" INTEGER,
    "auto_apply" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "voucher_code_id" UUID,
    "source" "ApplySource" NOT NULL DEFAULT 'auto',
    "applied_by_id" UUID,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "snapshot" JSONB,
    "notes" TEXT,
    "revoked_at" TIMESTAMP(6),
    "revoked_by_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vouchers_tenant_id_idx" ON "vouchers"("tenant_id");

-- CreateIndex
CREATE INDEX "vouchers_tenant_id_status_idx" ON "vouchers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "vouchers_tenant_id_kind_status_idx" ON "vouchers"("tenant_id", "kind", "status");

-- CreateIndex
CREATE INDEX "vouchers_tenant_id_auto_apply_is_public_status_idx" ON "vouchers"("tenant_id", "auto_apply", "is_public", "status");

-- CreateIndex
CREATE INDEX "vouchers_starts_at_ends_at_idx" ON "vouchers"("starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_tenant_id_code_key" ON "vouchers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "voucher_codes_voucher_id_idx" ON "voucher_codes"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_codes_tenant_id_code_is_active_idx" ON "voucher_codes"("tenant_id", "code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_codes_tenant_id_code_key" ON "voucher_codes"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "voucher_redemptions_tenant_id_idx" ON "voucher_redemptions"("tenant_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_voucher_id_idx" ON "voucher_redemptions"("voucher_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_order_id_idx" ON "voucher_redemptions"("order_id");

-- CreateIndex
CREATE INDEX "voucher_redemptions_tenant_id_voucher_id_created_at_idx" ON "voucher_redemptions"("tenant_id", "voucher_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_order_id_voucher_id_key" ON "voucher_redemptions"("order_id", "voucher_id");

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_codes" ADD CONSTRAINT "voucher_codes_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
