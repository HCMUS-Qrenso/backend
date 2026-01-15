-- Add unaccented columns for tables, modifier_groups, and modifiers
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "table_number_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(table_number)) STORED;

ALTER TABLE "modifier_groups" ADD COLUMN IF NOT EXISTS "name_unaccent" TEXT GENERATED ALWAYS AS (immutable_unaccent(name)) STORED;

-- Create GIN indexes for trigram similarity search
CREATE INDEX IF NOT EXISTS "tables_table_number_unaccent_trgm_idx" ON "tables" USING GIN (table_number_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "modifier_groups_name_unaccent_trgm_idx" ON "modifier_groups" USING GIN (name_unaccent gin_trgm_ops);