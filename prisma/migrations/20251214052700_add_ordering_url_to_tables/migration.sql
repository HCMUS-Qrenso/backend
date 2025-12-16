-- Add ordering_url field to tables
ALTER TABLE "tables" ADD COLUMN "ordering_url" VARCHAR(500);

-- Add comment for clarity
COMMENT ON COLUMN "tables"."ordering_url" IS 'The actual ordering URL embedded in QR code (e.g., https://app.../menu?table=x&token=y)';
COMMENT ON COLUMN "tables"."qr_code_url" IS 'External QR image URL for frontend display (e.g., https://api.qrserver.com/...)';
