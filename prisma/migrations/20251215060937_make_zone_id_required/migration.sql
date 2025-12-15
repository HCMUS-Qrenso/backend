/*
  Warnings:

  - Made the column `zone_id` on table `tables` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tables" ALTER COLUMN "zone_id" SET NOT NULL;
