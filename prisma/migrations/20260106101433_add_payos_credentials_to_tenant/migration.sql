-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "payos_api_key" VARCHAR(255),
ADD COLUMN     "payos_checksum_key" VARCHAR(255),
ADD COLUMN     "payos_client_id" VARCHAR(255);
