-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number" VARCHAR(15) NOT NULL,
    "name" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "address_line_1" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "common_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tag" VARCHAR(50) NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "landmark" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "common_point_id" UUID,
    "phone_number" VARCHAR(15),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "diet_type" VARCHAR(20) NOT NULL,
    "cuisine_type" VARCHAR(20) NOT NULL,
    "includes_breakfast" BOOLEAN NOT NULL DEFAULT false,
    "includes_lunch" BOOLEAN NOT NULL DEFAULT false,
    "includes_dinner" BOOLEAN NOT NULL DEFAULT false,
    "includes_snacks" BOOLEAN NOT NULL DEFAULT false,
    "duration_days" INTEGER NOT NULL,
    "default_container" VARCHAR(20) NOT NULL,
    "allows_container_choice" BOOLEAN NOT NULL DEFAULT false,
    "allows_diet_upgrade" BOOLEAN NOT NULL DEFAULT false,
    "allows_cuisine_upgrade" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "meal_package_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "container_type" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "diet_type" VARCHAR(20) NOT NULL,
    "cuisine_type" VARCHAR(20) NOT NULL,
    "week_start_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weekly_menu_id" UUID NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "item_name" TEXT NOT NULL,

    CONSTRAINT "weekly_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_time_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "delivery_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "service_date" DATE NOT NULL,
    "item_type" VARCHAR(20) NOT NULL,
    "delivery_slot_id" UUID,
    "delivery_group_id" UUID,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_pauses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_type" VARCHAR(20) NOT NULL,
    "paused_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_pauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curry_token_packages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "diet_type" VARCHAR(20) NOT NULL,
    "token_count" INTEGER NOT NULL,
    "validity_days" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curry_token_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_curry_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "diet_type" VARCHAR(20) NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "used_tokens" INTEGER NOT NULL DEFAULT 0,
    "valid_until" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_curry_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curry_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "cuisine_type" VARCHAR(20) NOT NULL,
    "order_date" DATE NOT NULL,
    "delivery_slot_id" UUID,
    "delivery_group_id" UUID,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curry_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upgrade_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "upgrade_type" VARCHAR(30) NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "meal_type" VARCHAR(20),
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "upgrade_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_upgrades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscription_id" UUID NOT NULL,
    "upgrade_type" VARCHAR(30) NOT NULL,
    "scope" VARCHAR(20) NOT NULL,
    "meal_type" VARCHAR(20),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_menus_diet_type_cuisine_type_week_start_date_key" ON "weekly_menus"("diet_type", "cuisine_type", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_meals_subscription_id_service_date_item_type_key" ON "subscription_meals"("subscription_id", "service_date", "item_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_curry_wallets_user_id_diet_type_key" ON "user_curry_wallets"("user_id", "diet_type");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_common_point_id_fkey" FOREIGN KEY ("common_point_id") REFERENCES "common_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_meal_package_id_fkey" FOREIGN KEY ("meal_package_id") REFERENCES "meal_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_items" ADD CONSTRAINT "weekly_menu_items_weekly_menu_id_fkey" FOREIGN KEY ("weekly_menu_id") REFERENCES "weekly_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_groups" ADD CONSTRAINT "delivery_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_meals" ADD CONSTRAINT "subscription_meals_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_meals" ADD CONSTRAINT "subscription_meals_delivery_slot_id_fkey" FOREIGN KEY ("delivery_slot_id") REFERENCES "delivery_time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_meals" ADD CONSTRAINT "subscription_meals_delivery_group_id_fkey" FOREIGN KEY ("delivery_group_id") REFERENCES "delivery_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_pauses" ADD CONSTRAINT "meal_pauses_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_curry_wallets" ADD CONSTRAINT "user_curry_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curry_orders" ADD CONSTRAINT "curry_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curry_orders" ADD CONSTRAINT "curry_orders_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "user_curry_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curry_orders" ADD CONSTRAINT "curry_orders_delivery_slot_id_fkey" FOREIGN KEY ("delivery_slot_id") REFERENCES "delivery_time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curry_orders" ADD CONSTRAINT "curry_orders_delivery_group_id_fkey" FOREIGN KEY ("delivery_group_id") REFERENCES "delivery_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_upgrades" ADD CONSTRAINT "subscription_upgrades_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
