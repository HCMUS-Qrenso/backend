-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255),
    "slug" VARCHAR(100) NOT NULL,
    "owner_id" UUID NOT NULL,
    "subscription_tier" VARCHAR(50) NOT NULL DEFAULT 'basic',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "settings" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" VARCHAR(500),
    "role" VARCHAR(20) NOT NULL,
    "tenant_id" UUID,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_oauth_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_oauth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "preparation_time" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "is_chef_recommendation" BOOLEAN NOT NULL DEFAULT false,
    "allergen_info" TEXT,
    "nutritional_info" JSONB,
    "popularity_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_selections" INTEGER NOT NULL DEFAULT 0,
    "max_selections" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modifier_group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_adjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_modifier_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "modifier_group_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_pairings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "related_item_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "table_number" VARCHAR(20) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "position" VARCHAR(100),
    "floor" VARCHAR(100),
    "shape" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'available',
    "qr_code_token" VARCHAR(500),
    "qr_code_url" VARCHAR(500),
    "qr_code_generated_at" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_id" UUID NOT NULL,
    "customer_id" UUID,
    "guest_name" VARCHAR(255),
    "session_token" VARCHAR(500) NOT NULL,
    "started_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(6),
    "duration_minutes" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" VARCHAR(50) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "table_session_id" UUID NOT NULL,
    "customer_id" UUID,
    "waiter_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "special_instructions" TEXT,
    "rejection_reason" TEXT,
    "accepted_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "modifiers_total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "special_instructions" TEXT,
    "preparation_started_at" TIMESTAMP(6),
    "preparation_completed_at" TIMESTAMP(6),
    "served_at" TIMESTAMP(6),
    "estimated_prep_time" INTEGER,
    "actual_prep_time" INTEGER,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_item_id" UUID NOT NULL,
    "modifier_id" UUID NOT NULL,
    "modifier_name" VARCHAR(100) NOT NULL,
    "price_adjustment" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" VARCHAR(20),
    "to_status" VARCHAR(20) NOT NULL,
    "changed_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "transaction_id" VARCHAR(255),
    "gateway_response" JSONB,
    "paid_at" TIMESTAMP(6),
    "refunded_at" TIMESTAMP(6),
    "refund_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_sales_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_customers" INTEGER NOT NULL DEFAULT 0,
    "average_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "peak_hour" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_sales_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_analytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_item_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_ordered" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cancelled" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2),
    "average_prep_time" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_owner_id_idx" ON "tenants"("owner_id");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_verification_tokens_token_key" ON "user_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "user_verification_tokens_token_idx" ON "user_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "user_verification_tokens_user_id_idx" ON "user_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "user_verification_tokens_token_type_expires_at_idx" ON "user_verification_tokens"("token", "type", "expires_at");

-- CreateIndex
CREATE INDEX "user_oauth_providers_user_id_idx" ON "user_oauth_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_oauth_providers_provider_provider_user_id_key" ON "user_oauth_providers"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_display_order_idx" ON "categories"("tenant_id", "display_order");

-- CreateIndex
CREATE INDEX "categories_tenant_id_is_active_idx" ON "categories"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_idx" ON "menu_items"("tenant_id");

-- CreateIndex
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_category_id_idx" ON "menu_items"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_status_idx" ON "menu_items"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_popularity_score_idx" ON "menu_items"("tenant_id", "popularity_score");

-- CreateIndex
CREATE INDEX "menu_items_tenant_id_is_chef_recommendation_idx" ON "menu_items"("tenant_id", "is_chef_recommendation");

-- CreateIndex
CREATE INDEX "menu_item_images_menu_item_id_idx" ON "menu_item_images"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_images_menu_item_id_is_primary_idx" ON "menu_item_images"("menu_item_id", "is_primary");

-- CreateIndex
CREATE INDEX "modifier_groups_tenant_id_idx" ON "modifier_groups"("tenant_id");

-- CreateIndex
CREATE INDEX "modifiers_modifier_group_id_idx" ON "modifiers"("modifier_group_id");

-- CreateIndex
CREATE INDEX "menu_item_modifier_groups_menu_item_id_idx" ON "menu_item_modifier_groups"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_modifier_groups_modifier_group_id_idx" ON "menu_item_modifier_groups"("modifier_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_modifier_groups_menu_item_id_modifier_group_id_key" ON "menu_item_modifier_groups"("menu_item_id", "modifier_group_id");

-- CreateIndex
CREATE INDEX "menu_item_pairings_menu_item_id_idx" ON "menu_item_pairings"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_pairings_related_item_id_idx" ON "menu_item_pairings"("related_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_pairings_menu_item_id_related_item_id_key" ON "menu_item_pairings"("menu_item_id", "related_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_qr_code_token_key" ON "tables"("qr_code_token");

-- CreateIndex
CREATE INDEX "tables_tenant_id_idx" ON "tables"("tenant_id");

-- CreateIndex
CREATE INDEX "tables_qr_code_token_idx" ON "tables"("qr_code_token");

-- CreateIndex
CREATE INDEX "tables_tenant_id_status_idx" ON "tables"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_tenant_id_table_number_key" ON "tables"("tenant_id", "table_number");

-- CreateIndex
CREATE UNIQUE INDEX "table_sessions_session_token_key" ON "table_sessions"("session_token");

-- CreateIndex
CREATE INDEX "table_sessions_table_id_idx" ON "table_sessions"("table_id");

-- CreateIndex
CREATE INDEX "table_sessions_session_token_idx" ON "table_sessions"("session_token");

-- CreateIndex
CREATE INDEX "table_sessions_customer_id_idx" ON "table_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "table_sessions_table_id_status_idx" ON "table_sessions"("table_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_table_id_idx" ON "orders"("table_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_waiter_id_idx" ON "orders"("waiter_id");

-- CreateIndex
CREATE INDEX "orders_table_session_id_idx" ON "orders"("table_session_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_tenant_id_priority_created_at_idx" ON "orders"("tenant_id", "priority", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_status_idx" ON "order_items"("order_id", "status");

-- CreateIndex
CREATE INDEX "order_item_modifiers_order_item_id_idx" ON "order_item_modifiers"("order_item_id");

-- CreateIndex
CREATE INDEX "order_item_modifiers_modifier_id_idx" ON "order_item_modifiers"("modifier_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_created_at_idx" ON "order_status_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_payment_method_idx" ON "payments"("tenant_id", "payment_method");

-- CreateIndex
CREATE INDEX "payments_tenant_id_paid_at_idx" ON "payments"("tenant_id", "paid_at");

-- CreateIndex
CREATE INDEX "reviews_menu_item_id_idx" ON "reviews"("menu_item_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- CreateIndex
CREATE INDEX "reviews_order_id_idx" ON "reviews"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_customer_id_order_id_menu_item_id_key" ON "reviews"("customer_id", "order_id", "menu_item_id");

-- CreateIndex
CREATE INDEX "daily_sales_summary_tenant_id_idx" ON "daily_sales_summary"("tenant_id");

-- CreateIndex
CREATE INDEX "daily_sales_summary_date_idx" ON "daily_sales_summary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_sales_summary_tenant_id_date_key" ON "daily_sales_summary"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "menu_item_analytics_menu_item_id_idx" ON "menu_item_analytics"("menu_item_id");

-- CreateIndex
CREATE INDEX "menu_item_analytics_tenant_id_idx" ON "menu_item_analytics"("tenant_id");

-- CreateIndex
CREATE INDEX "menu_item_analytics_date_idx" ON "menu_item_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_analytics_menu_item_id_date_key" ON "menu_item_analytics"("menu_item_id", "date");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "settings_tenant_id_idx" ON "settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_key_key" ON "settings"("tenant_id", "key");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verification_tokens" ADD CONSTRAINT "user_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_oauth_providers" ADD CONSTRAINT "user_oauth_providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_images" ADD CONSTRAINT "menu_item_images_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_groups" ADD CONSTRAINT "modifier_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_pairings" ADD CONSTRAINT "menu_item_pairings_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_pairings" ADD CONSTRAINT "menu_item_pairings_related_item_id_fkey" FOREIGN KEY ("related_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_session_id_fkey" FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "modifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_sales_summary" ADD CONSTRAINT "daily_sales_summary_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_analytics" ADD CONSTRAINT "menu_item_analytics_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_analytics" ADD CONSTRAINT "menu_item_analytics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
