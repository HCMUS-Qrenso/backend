-- Increase qr_code_url size to handle long encoded URLs
ALTER TABLE "tables" ALTER COLUMN "qr_code_url" TYPE TEXT;
ALTER TABLE "tables" ALTER COLUMN "ordering_url" TYPE TEXT;
ALTER TABLE "tables" ALTER COLUMN "qr_code_token" TYPE TEXT;

-- Add comments
COMMENT ON COLUMN "tables"."qr_code_url" IS 'External QR image URL from api.qrserver.com (can be long due to encoded URL)';
COMMENT ON COLUMN "tables"."ordering_url" IS 'Actual ordering link embedded in QR code';
COMMENT ON COLUMN "tables"."qr_code_token" IS 'JWT token for QR authentication';
