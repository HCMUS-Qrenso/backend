/*
  Warnings:

  - You are about to drop the column `floor` on the `tables` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tables" DROP COLUMN "floor",
ADD COLUMN     "zone_id" UUID;

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_tenant_id_idx" ON "zones"("tenant_id");

-- CreateIndex
CREATE INDEX "zones_tenant_id_display_order_idx" ON "zones"("tenant_id", "display_order");

-- CreateIndex
CREATE INDEX "zones_tenant_id_is_active_idx" ON "zones"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "zones_tenant_id_name_key" ON "zones"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "tables_zone_id_idx" ON "tables"("zone_id");

-- CreateIndex
CREATE INDEX "tables_tenant_id_zone_id_idx" ON "tables"("tenant_id", "zone_id");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
