-- Enable PostgreSQL extensions for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create an immutable wrapper for unaccent function
-- This is required for generated columns
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT unaccent('unaccent', $1);
$$;

-- Create indexes for existing search columns (from drift detection)
CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories"("name");
CREATE INDEX IF NOT EXISTS "categories_description_idx" ON "categories"("description");
CREATE INDEX IF NOT EXISTS "menu_items_name_idx" ON "menu_items"("name");
CREATE INDEX IF NOT EXISTS "tables_table_number_idx" ON "tables"("table_number");
CREATE INDEX IF NOT EXISTS "tenants_name_idx" ON "tenants"("name");
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_full_name_idx" ON "users"("full_name");
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
CREATE INDEX IF NOT EXISTS "vouchers_code_idx" ON "vouchers"("code");
CREATE INDEX IF NOT EXISTS "vouchers_name_idx" ON "vouchers"("name");
CREATE INDEX IF NOT EXISTS "zones_name_idx" ON "zones"("name");

-- Add unaccented columns for Vietnamese text search
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(COALESCE(description, ''))) STORED;

ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "description_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(COALESCE(description, ''))) STORED;

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "slug_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(slug)) STORED;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(full_name)) STORED;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(email)) STORED;

ALTER TABLE "zones" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;

ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "code_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(code)) STORED;

-- Create GIN indexes for trigram similarity search on unaccented columns
CREATE INDEX IF NOT EXISTS "categories_name_unaccent_trgm_idx" ON "categories" USING GIN (name_unaccent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "categories_description_unaccent_trgm_idx" ON "categories" USING GIN (description_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "menu_items_name_unaccent_trgm_idx" ON "menu_items" USING GIN (name_unaccent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "menu_items_description_unaccent_trgm_idx" ON "menu_items" USING GIN (description_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "tenants_name_unaccent_trgm_idx" ON "tenants" USING GIN (name_unaccent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "tenants_slug_unaccent_trgm_idx" ON "tenants" USING GIN (slug_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "users_full_name_unaccent_trgm_idx" ON "users" USING GIN (full_name_unaccent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_email_unaccent_trgm_idx" ON "users" USING GIN (email_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "zones_name_unaccent_trgm_idx" ON "zones" USING GIN (name_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "vouchers_name_unaccent_trgm_idx" ON "vouchers" USING GIN (name_unaccent gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vouchers_code_unaccent_trgm_idx" ON "vouchers" USING GIN (code_unaccent gin_trgm_ops);
