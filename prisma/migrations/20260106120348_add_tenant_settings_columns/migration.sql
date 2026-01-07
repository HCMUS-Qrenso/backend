/*
  Warnings:

  - You are about to drop the column `settings` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "settings" DROP CONSTRAINT "settings_tenant_id_fkey";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "settings",
ADD COLUMN     "allow_special_instructions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
ADD COLUMN     "currency_symbol" VARCHAR(5) NOT NULL DEFAULT '₫',
ADD COLUMN     "date_format" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "estimated_prep_time" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "invoice_prefix" VARCHAR(10) NOT NULL DEFAULT 'QR-',
ADD COLUMN     "language" VARCHAR(10) NOT NULL DEFAULT 'vi',
ADD COLUMN     "min_order_value" DECIMAL(10,2),
ADD COLUMN     "notify_email" VARCHAR(255),
ADD COLUMN     "notify_email_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_sound_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "operating_hours" JSONB,
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "receipt_footer" VARCHAR(500),
ADD COLUMN     "receipt_header" VARCHAR(500),
ADD COLUMN     "receipt_show_logo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "require_guest_count" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "service_charge_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "service_charge_min_party" INTEGER,
ADD COLUMN     "service_charge_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "service_charge_taxable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "session_timeout_minutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tax_label" VARCHAR(20) NOT NULL DEFAULT 'VAT',
ADD COLUMN     "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

-- DropTable
DROP TABLE "settings";
