/*
  Warnings:

  - You are about to drop the column `duration_days` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `includes_breakfast` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `includes_dinner` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `includes_lunch` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `includes_snacks` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `meal_packages` table. All the data in the column will be lost.
  - You are about to drop the column `item_type` on the `subscription_meals` table. All the data in the column will be lost.
  - You are about to drop the column `upgrade_type` on the `subscription_upgrades` table. All the data in the column will be lost.
  - You are about to drop the column `upgrade_type` on the `upgrade_prices` table. All the data in the column will be lost.
  - You are about to drop the column `item_type` on the `weekly_menu_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subscription_id,service_date,meal_type]` on the table `subscription_meals` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[diet_type,cuisine_type,tier,week_start_date]` on the table `weekly_menus` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `meal_type` to the `subscription_meals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `day_of_week` to the `weekly_menu_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meal_type` to the `weekly_menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'REGULAR', 'PREMIUM');

-- DropIndex
DROP INDEX "subscription_meals_subscription_id_service_date_item_type_key";

-- DropIndex
DROP INDEX "weekly_menus_diet_type_cuisine_type_week_start_date_key";

-- AlterTable
ALTER TABLE "meal_packages" DROP COLUMN "duration_days",
DROP COLUMN "includes_breakfast",
DROP COLUMN "includes_dinner",
DROP COLUMN "includes_lunch",
DROP COLUMN "includes_snacks",
DROP COLUMN "price",
ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "subscription_meals" DROP COLUMN "item_type",
ADD COLUMN     "meal_type" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "subscription_upgrades" DROP COLUMN "upgrade_type",
ADD COLUMN     "original_cuisine" VARCHAR(20),
ADD COLUMN     "original_diet" VARCHAR(20),
ADD COLUMN     "original_tier" "PlanTier",
ADD COLUMN     "target_cuisine" VARCHAR(20),
ADD COLUMN     "target_diet" VARCHAR(20),
ADD COLUMN     "target_tier" "PlanTier";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "meals_included" TEXT[],
ADD COLUMN     "pricing_id" UUID;

-- AlterTable
ALTER TABLE "upgrade_prices" DROP COLUMN "upgrade_type",
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "from_cuisine" VARCHAR(20),
ADD COLUMN     "from_diet" VARCHAR(20),
ADD COLUMN     "from_tier" "PlanTier",
ADD COLUMN     "name" VARCHAR(100) NOT NULL DEFAULT 'Upgrade',
ADD COLUMN     "to_cuisine" VARCHAR(20),
ADD COLUMN     "to_diet" VARCHAR(20),
ADD COLUMN     "to_tier" "PlanTier";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" VARCHAR(255) NOT NULL,
ADD COLUMN     "password" VARCHAR(255) NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ALTER COLUMN "phone_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "weekly_menu_items" DROP COLUMN "item_type",
ADD COLUMN     "day_of_week" INTEGER NOT NULL,
ADD COLUMN     "meal_type" VARCHAR(20) NOT NULL,
ADD COLUMN     "menu_item_id" UUID;

-- AlterTable
ALTER TABLE "weekly_menus" ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'REGULAR';

-- CreateTable
CREATE TABLE "package_pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meal_package_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "meals_included" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "category_id" UUID,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "admin_id" UUID,
    "resolution" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_meals_subscription_id_service_date_meal_type_key" ON "subscription_meals"("subscription_id", "service_date", "meal_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_menus_diet_type_cuisine_type_tier_week_start_date_key" ON "weekly_menus"("diet_type", "cuisine_type", "tier", "week_start_date");

-- AddForeignKey
ALTER TABLE "package_pricing" ADD CONSTRAINT "package_pricing_meal_package_id_fkey" FOREIGN KEY ("meal_package_id") REFERENCES "meal_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "package_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_items" ADD CONSTRAINT "weekly_menu_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
