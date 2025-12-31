-- AlterTable
ALTER TABLE "table_sessions" ADD COLUMN     "device_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expires_at" TIMESTAMP(6),
ADD COLUMN     "guest_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "last_activity_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(255) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "response" JSONB,
    "status_code" INTEGER,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "table_session_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "device_id" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_key_idx" ON "idempotency_keys"("key");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "analytics_events_tenant_id_event_type_created_at_idx" ON "analytics_events"("tenant_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_table_session_id_idx" ON "analytics_events"("table_session_id");

-- CreateIndex
CREATE INDEX "table_sessions_expires_at_idx" ON "table_sessions"("expires_at");
