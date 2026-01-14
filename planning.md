# Vyanjo Backend - Meal + Curry Subscription System Implementation Plan

## Overview

Building a complete Node.js backend for a meal and curry subscription service with Firebase phone authentication, PostgreSQL database, and comprehensive business logic for subscriptions, curry tokens, meal scheduling, pausing, upgrades, and delivery management.

## Tech Stack Decisions

### Core Technologies

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **ORM**: Prisma (for migrations and schema management)
- **Authentication**: Firebase Admin SDK (phone auth token verification)
- **Language**: JavaScript (ES6+)
- **Validation**: express-validator
- **Timezone**: IST (Asia/Kolkata) - enforced throughout

## Repository

- **Location**: `/workspace/cmjpodmri02bkimtmq0kb5zx4/vyanjo-backend`
- **Status**: Greenfield (empty repository, only .gitignore and README exist)

## Project Structure

**Approach**: Layer-based architecture (controllers, services, routes separated by layer)

```
vyanjo-backend/
├── src/
│   ├── controllers/       # Request/response handling
│   ├── services/          # Business logic
│   ├── routes/            # Route definitions
│   ├── middleware/        # Auth, error handling, validation
│   ├── utils/             # Helpers, timezone utilities
│   ├── config/            # Configuration (Firebase, database)
│   └── index.js           # Entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration files
├── package.json
└── .env.example
```

## Error Handling Strategy

**Pattern**: Centralized error middleware that catches all errors and returns consistent JSON responses

**Error Response Format**:

```json
{
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

**Error Types to Handle**:

- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Business logic errors (422)
- Database errors (500)
- Firebase auth errors (401/500)

## Timezone Handling

**Library**: moment-timezone
**Timezone**: Asia/Kolkata (IST)

**Usage**:

- All date/time comparisons for business logic done in IST
- Database stores timestamps in UTC (PostgreSQL TIMESTAMP WITH TIME ZONE)
- API accepts/returns dates in ISO format, converted to IST for logic
- Critical for 8 PM pause deadline enforcement

**Utility Function**: `src/utils/timezone.ts`

- `getCurrentISTTime()`: Returns current time in IST
- `isBeforePauseDeadline()`: Checks if current time < 8 PM IST
- `convertToIST()`: Converts any date to IST
- `getTodayIST()`: Returns today's date in IST

## Core Business Logic Decisions

### Meal Generation Strategy

**Approach**: On-demand generation (meals created when user views their schedule)

**How it works**:

- When `GET /subscriptions/active` or `GET /meals/schedule` called
- Service checks if `subscription_meals` exist for requested date range
- If not exists, generates rows based on subscription's meal_package
- Assigns default delivery time slots
- Returns generated meals

**Benefits**:

- No upfront computation overhead
- Flexible for future changes
- Only generates what's needed

### Pause Limitations

**Rule**: Users can only pause meals for **tomorrow onwards** (Requested day must be > today).

**Rationale**:

- Enforces user planning (subscriptions can't be paused same-day).
- Simplifies production logic.

**Enforcement**:

- `POST /subscriptions/:id/pause` validates: `meal_date > getTodayIST()`.

### Data Integrity Rules

**One Active Subscription Per User**:

- Database: Partial unique index on `subscriptions(user_id)` WHERE `status = 'active'`
- Application: Service layer checks for existing active subscription before creating new one
- Error if violated: 422 "You already have an active subscription"

**One Primary Address Per User**:

- Application logic only (checked in service layer)
- When setting `is_primary = true`, unset all other addresses for that user
- Default: First address created is automatically primary

---

## Database Setup

### Prisma Schema Location

**File**: `prisma/schema.prisma`

### Database Connection

**Environment variable**: `DATABASE_URL` (PostgreSQL connection string)
**Example**: `postgresql://user:password@localhost:5432/vyanjo_db?schema=public`

### Migration Strategy

- Use Prisma Migrate: `prisma migrate dev --name init` for initial schema
- All subsequent changes through migrations
- Migrations stored in `prisma/migrations/`

### Prisma Schema Definition

**File**: `prisma/schema.prisma`

Complete schema with all 17 tables:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum Role {
  USER
  ADMIN
}

enum PlanTier {
  BASIC
  REGULAR
  PREMIUM
}

// 1. Users table
model User {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phoneNumber String?  @unique @map("phone_number") @db.VarChar(15) // Now Optional
  email       String   @unique @db.VarChar(255) // Required
  password    String   @db.VarChar(255)         // Required (Hashed)
  role        Role     @default(USER)
  name        String?  @db.VarChar(100)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  addresses         Address[]
  subscriptions     Subscription[]
  curryWallets      CurryWallet[]
  curryOrders       CurryOrder[]
  notifications     Notification[]
  deliveryGroups    DeliveryGroup[]

  // Relations for Issues
  raisedIssues      Issue[] @relation("UserIssues")
  resolvedIssues    Issue[] @relation("AdminIssues")

  @@map("users")
}

// 2. Common points
model CommonPoint {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String   @db.VarChar(150)
  addressLine1 String?  @map("address_line_1") @db.Text
  city         String?  @db.VarChar(100)
  state        String?  @db.VarChar(100)
  pincode      String?  @db.VarChar(10)
  latitude     Decimal? @db.Decimal(9, 6)
  longitude    Decimal? @db.Decimal(9, 6)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  addresses Address[]

  @@map("common_points")
}

// 3. Addresses
model Address {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  tag            String   @db.VarChar(50)
  addressLine1   String   @map("address_line_1") @db.Text
  addressLine2   String?  @map("address_line_2") @db.Text
  landmark       String?  @db.Text
  city           String   @db.VarChar(100)
  state          String   @db.VarChar(100)
  pincode        String   @db.VarChar(10)
  latitude       Decimal? @db.Decimal(9, 6)
  longitude      Decimal? @db.Decimal(9, 6)
  commonPointId  String?  @map("common_point_id") @db.Uuid
  phoneNumber    String?  @map("phone_number") @db.VarChar(15)
  isPrimary      Boolean  @default(false) @map("is_primary")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  commonPoint  CommonPoint?  @relation(fields: [commonPointId], references: [id])
  subscriptions Subscription[]

  @@map("addresses")
}

// 4. Meal packages (Metadata only)
model MealPackage {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                  String   @db.VarChar(150) // e.g. "Basic Veg North"
  dietType              String   @map("diet_type") @db.VarChar(20) // Veg, NonVeg
  cuisineType           String   @map("cuisine_type") @db.VarChar(20) // North, South
  tier                  PlanTier @default(REGULAR)

  // Container info (still relevant for the package type)
  defaultContainer      String   @map("default_container") @db.VarChar(20)
  allowsContainerChoice Boolean  @default(false) @map("allows_container_choice")

  // Upgradability flags
  allowsDietUpgrade     Boolean  @default(false) @map("allows_diet_upgrade")
  allowsCuisineUpgrade  Boolean  @default(false) @map("allows_cuisine_upgrade")

  isActive              Boolean  @default(true) @map("is_active")
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz

  pricingOptions        PackagePricing[]
  subscriptions         Subscription[]

  @@map("meal_packages")
}

// 4.1 Package Pricing (New: Flexible durations and combinations)
model PackagePricing {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  mealPackageId String   @map("meal_package_id") @db.Uuid
  name          String   @db.VarChar(150) // e.g. "Weekly Tiffin Only", "Monthly All Meals"

  durationDays  Int      @map("duration_days") // 1, 7, 30
  mealsIncluded String[] @map("meals_included") // ["TIFFIN"], ["LUNCH", "DINNER"]

  price         Decimal  @db.Decimal(10, 2)
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  mealPackage   MealPackage @relation(fields: [mealPackageId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]

  @@map("package_pricing")
}

// 5. Subscriptions
model Subscription {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  mealPackageId String   @map("meal_package_id") @db.Uuid
  pricingId     String?  @map("pricing_id") @db.Uuid // Link to the specific price plan purchased

  addressId     String   @map("address_id") @db.Uuid
  containerType String   @map("container_type") @db.VarChar(20)

  startDate     DateTime @map("start_date") @db.Date
  endDate       DateTime @map("end_date") @db.Date

  mealsIncluded String[] @map("meals_included") // Snapshot of what is enabled: ["TIFFIN", "LUNCH"]
  status        String   @db.VarChar(20) // ACTIVE, PAUSED, EXPIRED, CANCELLED

  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  user          User           @relation(fields: [userId], references: [id])
  mealPackage   MealPackage    @relation(fields: [mealPackageId], references: [id])
  pricing       PackagePricing? @relation(fields: [pricingId], references: [id])
  address       Address        @relation(fields: [addressId], references: [id])

  meals         SubscriptionMeal[]
  pauses        MealPause[]
  upgrades      SubscriptionUpgrade[]

  @@map("subscriptions")
}

// 6. Categories (Hierarchy for Menu)
model Category {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(100)
  description String?  @db.Text
  parentId    String?  @map("parent_id") @db.Uuid
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  menuItems   MenuItem[]

  @@map("categories")
}

// 7. Menu Items
model MenuItem {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(150)
  categoryId  String?  @map("category_id") @db.Uuid
  description String?  @db.Text
  imageUrl    String?  @map("image_url") @db.Text
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  category        Category?        @relation(fields: [categoryId], references: [id])
  weeklyMenuItems WeeklyMenuItem[]

  @@map("menu_items")
}

// 8. Weekly menus
model WeeklyMenu {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dietType      String   @map("diet_type") @db.VarChar(20)
  cuisineType   String   @map("cuisine_type") @db.VarChar(20)
  tier          PlanTier @default(REGULAR)
  weekStartDate DateTime @map("week_start_date") @db.Date // Determine the week
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  items WeeklyMenuItem[]

  @@unique([dietType, cuisineType, tier, weekStartDate])
  @@map("weekly_menus")
}

// 9. Weekly menu items
model WeeklyMenuItem {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  weeklyMenuId  String   @map("weekly_menu_id") @db.Uuid

  // e.g. 'TIFFIN', 'LUNCH', 'DINNER' - Corresponds to mealsIncluded
  mealType      String   @map("meal_type") @db.VarChar(20)

  dayOfWeek     Int      @map("day_of_week") // 1=Monday

  menuItemId    String?  @map("menu_item_id") @db.Uuid
  itemName      String   @map("item_name") @db.Text

  weeklyMenu    WeeklyMenu @relation(fields: [weeklyMenuId], references: [id], onDelete: Cascade)
  menuItem      MenuItem?  @relation(fields: [menuItemId], references: [id])

  @@map("weekly_menu_items")
}

// 8. Delivery time slots (unchanged but context)
model DeliveryTimeSlot {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String   @db.VarChar(50)
  startTime DateTime @map("start_time") @db.Time
  endTime   DateTime @map("end_time") @db.Time
  isActive  Boolean  @default(true) @map("is_active")

  subscriptionMeals SubscriptionMeal[]
  curryOrders       CurryOrder[]

  @@map("delivery_time_slots")
}

// 9. Delivery groups (unchanged)
model DeliveryGroup {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  serviceDate DateTime @map("service_date") @db.Date
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  user              User               @relation(fields: [userId], references: [id])
  subscriptionMeals SubscriptionMeal[]
  curryOrders       CurryOrder[]

  @@map("delivery_groups")
}

// 10. Subscription meals
model SubscriptionMeal {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriptionId  String   @map("subscription_id") @db.Uuid
  serviceDate     DateTime @map("service_date") @db.Date

  // Matches mealsIncluded e.g. 'TIFFIN', 'LUNCH'
  mealType        String   @map("meal_type") @db.VarChar(20)

  deliverySlotId  String?  @map("delivery_slot_id") @db.Uuid
  deliveryGroupId String?  @map("delivery_group_id") @db.Uuid
  isPaused        Boolean  @default(false) @map("is_paused")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  subscription    Subscription      @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  deliverySlot    DeliveryTimeSlot? @relation(fields: [deliverySlotId], references: [id])
  deliveryGroup   DeliveryGroup?    @relation(fields: [deliveryGroupId], references: [id])

  @@unique([subscriptionId, serviceDate, mealType])
  @@map("subscription_meals")
}

// 11. Meal pauses
model MealPause {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriptionId String   @map("subscription_id") @db.Uuid
  mealDate       DateTime @map("meal_date") @db.Date
  mealType       String   @map("meal_type") @db.VarChar(20)
  pausedAt       DateTime @default(now()) @map("paused_at") @db.Timestamptz

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@map("meal_pauses")
}

// 12. Curry token packages
model CurryTokenPackage {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String   @db.VarChar(100)
  dietType     String   @map("diet_type") @db.VarChar(20)
  tokenCount   Int      @map("token_count")
  validityDays Int      @map("validity_days")
  price        Decimal  @db.Decimal(10, 2)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("curry_token_packages")
}

// 13. User curry wallets
model CurryWallet {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  dietType   String   @map("diet_type") @db.VarChar(20)
  totalTokens Int     @map("total_tokens")
  usedTokens  Int     @default(0) @map("used_tokens")
  validUntil  DateTime @map("valid_until") @db.Date
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  curryOrders CurryOrder[]

  @@unique([userId, dietType])
  @@map("user_curry_wallets")
}

// 14. Curry orders
model CurryOrder {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  walletId        String   @map("wallet_id") @db.Uuid
  cuisineType     String   @map("cuisine_type") @db.VarChar(20)
  orderDate       DateTime @map("order_date") @db.Date
  deliverySlotId  String?  @map("delivery_slot_id") @db.Uuid
  deliveryGroupId String?  @map("delivery_group_id") @db.Uuid
  status          String   @db.VarChar(20)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user          User              @relation(fields: [userId], references: [id])
  wallet        CurryWallet       @relation(fields: [walletId], references: [id])
  deliverySlot  DeliveryTimeSlot? @relation(fields: [deliverySlotId], references: [id])
  deliveryGroup DeliveryGroup?    @relation(fields: [deliveryGroupId], references: [id])

  @@map("curry_orders")
}

// 15. Upgrade prices
model UpgradePrice {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String    @default("Upgrade") @db.VarChar(100)
  fromTier    PlanTier? @map("from_tier")
  toTier      PlanTier? @map("to_tier")
  fromDiet    String?   @map("from_diet") @db.VarChar(20)
  toDiet      String?   @map("to_diet")   @db.VarChar(20)
  fromCuisine String?   @map("from_cuisine") @db.VarChar(20) // Added
  toCuisine   String?   @map("to_cuisine")   @db.VarChar(20) // Added
  scope       String    @db.VarChar(20) // MEAL, DAY, WEEK
  mealType    String?   @map("meal_type") @db.VarChar(20)
  price       Decimal   @db.Decimal(10, 2)
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  @@map("upgrade_prices")
}

// 16. Subscription upgrades
model SubscriptionUpgrade {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriptionId String    @map("subscription_id") @db.Uuid

  targetTier     PlanTier? @map("target_tier")
  targetDiet     String?   @map("target_diet") @db.VarChar(20)
  targetCuisine  String?   @map("target_cuisine") @db.VarChar(20) // Added

  originalTier   PlanTier? @map("original_tier")
  originalDiet   String?   @map("original_diet") @db.VarChar(20)
  originalCuisine String?  @map("original_cuisine") @db.VarChar(20) // Added

  scope          String    @db.VarChar(20)
  mealType       String?   @map("meal_type") @db.VarChar(20)
  startDate      DateTime  @map("start_date") @db.Date
  endDate        DateTime  @map("end_date") @db.Date
  price          Decimal   @db.Decimal(10, 2)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz

  subscription Subscription @relation(fields: [subscriptionId], references: [id])

  @@map("subscription_upgrades")
}

// 17. Notifications
model Notification {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  title     String   @db.VarChar(150)
  message   String   @db.Text
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}

// 18. Issues (Support Tickets)
model Issue {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  category    String   @db.VarChar(50) // e.g., 'delivery', 'food_quality', 'app'
  description String   @db.Text
  status      String   @default("open") @db.VarChar(20) // 'open', 'resolved', 'closed'
  adminId     String?  @map("admin_id") @db.Uuid // Admin who resolved it
  resolution  String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user  User  @relation("UserIssues", fields: [userId], references: [id])
  admin User? @relation("AdminIssues", fields: [adminId], references: [id])

  @@map("issues")
}
```

### Enum Values (Enforced in Application Layer)

**Diet Types**: `veg`, `non_veg`
**Cuisine Types**: `south_indian`, `north_indian`
**Container Types**: `plastic`, `steel`
**Subscription Status**: `active`, `completed`, `cancelled`
**Meal/Item Types**: `breakfast`, `lunch`, `dinner`, `snacks`, `curry_lunch`, `curry_dinner`
**Curry Order Status**: `ordered`, `cancelled`, `fulfilled`
**Upgrade Types**: `veg_to_nonveg`, `south_to_north`
**Upgrade Scope**: `meal`, `day`, `week`
**Address Tags**: `home`, `work`, `office`, `other`

---

## Firebase Authentication Setup

### Firebase Admin SDK Configuration

**File**: `src/config/firebase.ts`

**Environment Variables Required**:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY` (Base64 encoded or direct string)
- `FIREBASE_CLIENT_EMAIL`

**Initialization**:

```typescript
// Initialize Firebase Admin SDK with service account credentials
// Export admin instance for use in middleware
```

### Authentication Middleware

**File**: `src/middleware/auth.ts`

**Purpose**: Verify Firebase ID token on every protected route and attach user to request

**Behavior**:

1. Extract token from `Authorization` header (format: `Bearer <token>`)
2. If no token: Return 401 with `{"error": {"message": "No authentication token provided", "code": "NO_TOKEN", "status": 401}}`
3. Verify token using `admin.auth().verifyIdToken(token)`
4. If verification fails: Return 401 with `{"error": {"message": "Invalid or expired token", "code": "INVALID_TOKEN", "status": 401}}`
5. Extract `phone_number` from decoded token
6. Query database for user with matching `phone_number`
7. If user not exists: Create new user record with phone number
8. Attach user object to `req.user` with fields: `{id, phoneNumber, name}`
9. Call `next()` to proceed to route handler

**Usage**: Applied to all routes except `POST /auth/login`

**TypeScript Extension**: Extend Express Request type to include `user` property

---

## API Endpoints Specification

### Common Response Patterns

**Success Response Structure**:

```json
{
  "data": {
    /* response data */
  },
  "message": "Operation successful" // optional
}
```

**Error Response Structure** (handled by centralized middleware):

```json
{
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "status": 400
  }
}
```

### Module 1: Authentication

**Base Path**: `/api/auth`

#### POST /api/auth/login

**Purpose**: Sync Firebase-authenticated user with backend database

**Authentication**: Required (Firebase token in header)

**Request Body**: None (user identified from token)

**Process**:

1. Middleware extracts phone from token
2. Controller finds or creates user record
3. Returns user profile

**Response (200)**:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+919876543210",
      "name": null,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

#### PUT /api/auth/profile

**Purpose**: Update user's name

**Authentication**: Required

**Request Body**:

```json
{
  "name": "John Doe"
}
```

**Validation**:

- `name`: Required, string, 2-100 characters, trim whitespace

**Response (200)**:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+919876543210",
      "name": "John Doe",
      "updatedAt": "2025-01-15T11:00:00Z"
    }
  },
  "message": "Profile updated successfully"
}
```

**Errors**:

- 400 if validation fails
- 400 if validation fails
- 401 if not authenticated

#### GET /api/auth/profile

**Purpose**: Get current user profile details.

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+919876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

#### DELETE /api/auth/profile

**Purpose**: Deactivate (Soft Delete) current user account.

**Authentication**: Required

**Response (200)**:

```json
{
  "message": "Profile deactivated successfully"
}
```

---

### Module 2: Addresses & Common Points

**Base Path**: `/api/addresses`, `/api/common-points`

#### GET /api/common-points

**Purpose**: Search common delivery points (hostels, PGs, offices)

**Authentication**: Required

**Query Parameters**:

- `search` (optional): Search term for name/city/pincode
- `city` (optional): Filter by city
- `type` (optional): `global` (only system points), `personal` (only user points). Default: Both

**Response (200)**:

```json
{
  "data": {
    "commonPoints": [
      {
        "id": "uuid",
        "name": "ABC Hostel",
        "addressLine1": "Street 123",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500081",
        "latitude": 17.385,
        "longitude": 78.486
      }
    ]
  }
}
```

**Logic**:

- If `search` provided: Filter by name, city, or pincode containing search term (case-insensitive)
- If `city` provided: Exact match on city
- Only return `isActive = true` common points
- Order by name ascending

#### GET /api/addresses

**Purpose**: Get all addresses for authenticated user

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "addresses": [
      {
        "id": "uuid",
        "tag": "home",
        "addressLine1": "Flat 301, Tower A",
        "addressLine2": "Green Avenue",
        "landmark": "Near Metro Station",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500081",
        "latitude": 17.385,
        "longitude": 78.486,
        "phoneNumber": "+919876543210",
        "isPrimary": true,
        "commonPointId": "uuid-of-cp",
        "commonPoint": {
          "id": "uuid-of-cp",
          "name": "My Hostel",
          "isActive": true,
          "userId": "uuid-user-id" // or null for global
        },
        "createdAt": "2025-01-10T09:00:00Z"
      }
    ]
  }
}
```

**Logic**:

- Return all addresses for `req.user.id`
- Include related `commonPoint` data if linked
- Order by `isPrimary DESC`, then `createdAt DESC`

#### POST /api/addresses

**Purpose**: Create new address for user

**Authentication**: Required

**Request Body**:

```json
{
  "tag": "home",
  "addressLine1": "Flat 301, Tower A",
  "addressLine2": "Green Avenue",
  "landmark": "Near Metro Station",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500081",
  "latitude": 17.385,
  "longitude": 78.486,
  "commonPointId": null,
  "phoneNumber": "+919876543210",
  "isPrimary": false
}
```

**Validation**:

- `tag`: Required, one of ['home', 'work', 'office', 'other']
- `addressLine1`: Required, max 500 chars
- `addressLine2`: Optional, max 500 chars
- `landmark`: Optional, max 200 chars
- `city`: Required, max 100 chars
- `state`: Required, max 100 chars
- `pincode`: Required, 6 digits
- `latitude`: Optional, decimal (-90 to 90)
- `longitude`: Optional, decimal (-180 to 180)
- `commonPointId`: Optional, must exist if provided (Active and owned by user or global)
- `phoneNumber`: Optional, 10-15 digits with optional +91 prefix
- `isPrimary`: Optional boolean

**Business Logic**:

1. If this is user's first address, automatically set `isPrimary = true` regardless of request value
2. If `isPrimary = true` in request, update all other user addresses to `isPrimary = false`
3. If `commonPointId` provided:
   - Must exist
   - Must be `isActive = true`
   - Must be Global or Owned by current user
4. Create address record

**Response (201)**:

```json
{
  "data": {
    "address": {
      /* created address object */
    }
  },
  "message": "Address created successfully"
}
```

**Errors**:

- 400 if validation fails or Common Point is inactive
- 403 if unauthorized access to private Common Point
- 404 if `commonPointId` doesn't exist

#### PUT /api/addresses/:id

**Purpose**: Update existing address

**Authentication**: Required

**Authorization**: User can only update their own addresses

**Request Body**: Same as POST (all fields optional except those being updated)

**Validation**: Same as POST

**Business Logic**:

1. Verify address belongs to `req.user.id`, else return 403
2. If setting `isPrimary = true`, unset primary on other addresses
3. Update address

**Response (200)**:

```json
{
  "data": {
    "address": {
      /* updated address */
    }
  },
  "message": "Address updated successfully"
}
```

**Errors**:

- 403 if address doesn't belong to user
- 404 if address not found

#### DELETE /api/addresses/:id

**Purpose**: Delete address

**Authentication**: Required

**Authorization**: User can only delete their own addresses

**Business Logic**:

1. Verify address belongs to user
2. Check if address is used in any active subscription
3. If used in active subscription: Return 422 "Cannot delete address used in active subscription"
4. Delete address

**Response (200)**:

```json
{
  "message": "Address deleted successfully"
}
```

**Errors**:

- 403 if doesn't belong to user
- 404 if not found
- 422 if used in active subscription

#### POST /api/common-points

**Purpose**: Create a new user-specific Common Point (e.g. Private Hostel/PG)

**Authentication**: Required

**Request Body**:

```json
{
  "name": "My Hostel",
  "addressLine1": "H.No 1-2-3",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500001",
  "latitude": 17.123,
  "longitude": 78.123
}
```

**Response (201)**:

```json
{
  "data": {
    "commonPoint": {
      "id": "uuid",
      "name": "My Hostel",
      "isActive": true,
      "createdAt": "..."
    }
  },
  "message": "Common Point created"
}
```

#### PUT /api/common-points/:id

**Purpose**: Update a user-specific Common Point

**Authentication**: Required

**Authorization**: Only the creator can update

**Request Body**: Partial update of fields allowed

**Response (200)**:

```json
{
  "data": {
    "commonPoint": {
      /* updated object */
    }
  },
  "message": "Common Point updated"
}
```

#### DELETE /api/common-points/:id

**Purpose**: Delete (Soft Delete) a user-specific Common Point

**Authentication**: Required

**Authorization**: Only the creator can delete

**Response (200)**:

```json
{
  "data": {
    "commonPoint": {
      "isActive": false
    }
  },
  "message": "Common Point deleted"
}
```

---

### Module 3: Meal Packages

**Base Path**: `/api/meal-packages`

#### GET /api/meal-packages

**Purpose**: Browse available meal subscription plans

**Authentication**: Required

**Query Parameters**:

- `diet` (optional): Filter by diet type ['veg', 'non_veg']
- `cuisine` (optional): Filter by cuisine ['south_indian', 'north_indian']
- `duration` (optional): Filter by duration [7, 30]

**Response (200)**:

```json
{
  "data": {
    "packages": [
      {
        "id": "uuid",
        "name": "Basic Veg North",
        "dietType": "veg",
        "cuisineType": "north",
        "tier": "BASIC",
        "pricingOptions": [
          {
            "id": "uuid",
            "name": "1 Week Tiffin",
            "durationDays": 7,
            "mealsIncluded": ["TIFFIN"],
            "price": 500.0
          }
        ]
      }
    ]
  }
}
```

**Logic**:

- Only return packages where `isActive = true`
- Apply filters if provided
- Order by price ascending

#### GET /api/meal-packages/:id

**Purpose**: Get detailed information about specific package

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "package": {
      /* full package details */
    }
  }
}
```

**Errors**:

- 404 if package not found or inactive

---

### Module 4: Weekly Menus

**Base Path**: `/api/menus`

#### GET /api/menus/current

**Purpose**: Get this week's menu for user's subscription diet/cuisine

**Authentication**: Required

**Business Logic**:

1. Get user's active subscription
2. If no active subscription: Return 422 "No active subscription found"
3. Get subscription's `dietType` and `cuisineType`
4. Calculate current week start date (Monday of current week in IST)
5. Find `weekly_menus` matching diet, cuisine, and week
6. Include related `weekly_menu_items`

**Response (200)**:

```json
{
  "data": {
    "menu": {
      "id": "uuid",
      "dietType": "veg",
      "cuisineType": "south_indian",
      "weekStartDate": "2025-01-13",
      "items": [
        {
          "itemType": "breakfast",
          "menuItem": {
            "name": "Idli Sambar",
            "category": {
              "name": "Breakfast Specials"
            }
          }
        }
      ]
    }
  }
}
```

**Errors**:

- 422 if no active subscription
- 404 if no menu found for current week

#### GET /api/menus/week

**Purpose**: Get menu for specific week by date

**Authentication**: Required

**Query Parameters**:

- `date` (required): Any date within the week (ISO format: YYYY-MM-DD)
- `diet` (required): Diet type ['veg', 'non_veg']
- `cuisine` (required): Cuisine type ['south_indian', 'north_indian']

**Business Logic**:

1. Calculate week start date (Monday) for provided date
2. Find menu matching diet, cuisine, and week

**Response (200)**: Same as `/current`

**Errors**:

- 400 if parameters invalid
- 404 if menu not found

---

### Module 5: Subscriptions

**Base Path**: `/api/subscriptions`

#### POST /api/subscriptions

**Purpose**: Create new meal subscription

**Authentication**: Required

**Request Body**:

```json
{
  "pricing_id": "uuid",
  "address_id": "uuid",
  "container_type": "steel",
  "start_date": "2025-01-20",
  "slot_preferences": {
    "TIFFIN": "uuid_slot1",
    "LUNCH": "uuid_slot2"
  }
}
```

**Validation**:

- `pricing_id`: Required, must exist and be active
- `address_id`: Required, must belong to user
- `slot_preferences`: Optional map of MealType -> SlotID.

**Business Logic**:

1. Check user has no active subscription.
2. Fetch `PackagePricing` details.
3. Validate lunch slot timing if Tiffin also selected (7 AM vs 10 AM).
4. Calculate `endDate` based on `pricing.durationDays`.
5. Create subscription and generate `SubscriptionMeal` records immediately.
6. Return success.

**Response (201)**:

```json
{
  "data": {
    "subscription": {
      "id": "uuid",
      "mealPackage": {
        "id": "uuid",
        "name": "South Indian Veg Weekly",
        "dietType": "veg",
        "cuisineType": "south_indian"
      },
      "address": {
        "id": "uuid",
        "tag": "home",
        "addressLine1": "Flat 301"
      },
      "containerType": "steel",
      "startDate": "2025-01-20",
      "endDate": "2025-01-26",
      "status": "active",
      "createdAt": "2025-01-15T12:00:00Z"
    }
  },
  "message": "Subscription created successfully"
}
```

**Errors**:

- 422 if user has active subscription
- 404 if package or address not found
- 403 if address doesn't belong to user
- 400 if validation fails

#### GET /api/subscriptions/active

**Purpose**: Get user's active subscription details

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "subscription": {
      "id": "uuid",
      "mealPackage": {
        /* package details */
      },
      "address": {
        /* full address */
      },
      "containerType": "steel",
      "startDate": "2025-01-20",
      "endDate": "2025-01-26",
      "status": "active",
      "daysRemaining": 6
    }
  }
}
```

**Logic**:

- Find subscription where `userId = req.user.id` AND `status = 'active'`
- Include related `mealPackage` and `address` data
- Calculate `daysRemaining = endDate - currentDateIST`

**Errors**:

- 404 if no active subscription

#### GET /api/subscriptions/history

**Purpose**: Get past subscriptions

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "mealPackage": {
          /* package details */
        },
        "startDate": "2024-12-01",
        "endDate": "2024-12-30",
        "status": "completed",
        "createdAt": "2024-11-28T10:00:00Z"
      }
    ]
  }
}
```

**Logic**:

- Return subscriptions where `userId = req.user.id` AND `status IN ['completed', 'cancelled']`
- Order by `endDate DESC`
- Limit to most recent 10

---

### Module 6: Meal Schedule & Management

**Base Path**: `/api/meals`

#### GET /api/meals/schedule

**Purpose**: Get meal schedule for today and tomorrow (48-hour window)

**Authentication**: Required

**Business Logic**:

1. Get user's active subscription
2. If no active subscription: Return 422 "No active subscription found"
3. Calculate today's date in IST
4. Calculate tomorrow's date (today + 1 day)
5. Check if `subscription_meals` exist for today and tomorrow
6. **If not exist, generate them**:
   - For each date (today, tomorrow):
     - For each meal type in package (`includesBreakfast`, `includesLunch`, etc.):
       - Create `subscription_meals` row
       - Set `serviceDate`, `itemType`
       - Assign default `deliverySlotId` based on meal type (lookup from delivery_time_slots)
       - Set `isPaused = false`
7. Fetch and return generated meals
8. Include delivery slot details

**Response (200)**:

```json
{
  "data": {
    "meals": [
      {
        "id": "uuid",
        "serviceDate": "2025-01-15",
        "itemType": "breakfast",
        "deliverySlot": {
          "id": "uuid",
          "name": "Morning Slot",
          "startTime": "07:00:00",
          "endTime": "08:00:00"
        },
        "deliveryGroup": null,
        "isPaused": false
      },
      {
        "id": "uuid",
        "serviceDate": "2025-01-15",
        "itemType": "lunch",
        "deliverySlot": {
          "id": "uuid",
          "name": "Afternoon Slot",
          "startTime": "12:00:00",
          "endTime": "13:00:00"
        },
        "deliveryGroup": null,
        "isPaused": false
      }
    ]
  }
}
```

**Default Delivery Slot Mapping**:

- `breakfast` → Morning slot (7-8 AM)
- `lunch` → Afternoon slot (12-1 PM)
- `dinner` → Evening slot (7-8 PM)
- `snacks` → Evening slot (5-6 PM)

**Errors**:

- 422 if no active subscription

---

### Module 7: Delivery Time & Grouping

**Base Path**: `/api/delivery`

#### GET /api/delivery/slots

**Purpose**: Get available delivery time slots

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "slots": [
      {
        "id": "uuid",
        "name": "Morning Slot",
        "startTime": "07:00:00",
        "endTime": "08:00:00"
      }
    ]
  }
}
```

**Logic**:

- Return all slots where `isActive = true`
- Order by `startTime`

#### POST /api/meals/:mealId/delivery-slot

**Purpose**: Change delivery time for specific meal

**Authentication**: Required

**Request Body**:

```json
{
  "deliverySlotId": "uuid"
}
```

**Validation**:

- `deliverySlotId`: Required, must exist and be active

**Business Logic**:

1. Verify meal belongs to user's subscription
2. Verify meal date is today or tomorrow
3. Verify meal is not paused
4. Update `deliverySlotId`
5. Remove from any existing `deliveryGroupId` (set to null)

**Response (200)**:

```json
{
  "data": {
    "meal": {
      /* updated meal */
    }
  },
  "message": "Delivery time updated successfully"
}
```

**Errors**:

- 403 if meal doesn't belong to user
- 404 if meal or slot not found
- 422 if meal is paused

#### POST /api/meals/group

**Purpose**: Group multiple items for single delivery

**Authentication**: Required

**Request Body**:

```json
{
  "serviceDate": "2025-01-15",
  "mealIds": ["uuid1", "uuid2"],
  "deliverySlotId": "uuid"
}
```

**Validation**:

- `serviceDate`: Required, ISO date, must be today or tomorrow
- `mealIds`: Required, array of meal IDs, minimum 2 items
- `deliverySlotId`: Required, must exist

**Business Logic**:

1. Verify all meals belong to user's subscription
2. Verify all meals are for the same `serviceDate`
3. Verify none are paused
4. Create `delivery_groups` record with `userId`, `serviceDate`
5. Update all specified meals:
   - Set `deliveryGroupId` to created group
   - Set `deliverySlotId` to provided slot
6. Can include curry orders in `mealIds` (handled in curry module)

**Response (200)**:

```json
{
  "data": {
    "deliveryGroup": {
      "id": "uuid",
      "serviceDate": "2025-01-15",
      "meals": [
        /* updated meals */
      ]
    }
  },
  "message": "Meals grouped for delivery successfully"
}
```

**Errors**:

- 400 if mealIds count < 2
- 403 if any meal doesn't belong to user
- 422 if dates don't match or meals paused

#### DELETE /api/meals/group/:groupId

**Purpose**: Ungroup delivery group

**Authentication**: Required

**Business Logic**:

1. Verify group belongs to user
2. Update all meals in group: Set `deliveryGroupId = null`
3. Keep their current `deliverySlotId` (don't reset to default)
4. Delete delivery group record

**Response (200)**:

```json
{
  "message": "Delivery group removed successfully"
}
```

**Errors**:

- 403 if group doesn't belong to user
- 404 if group not found

---

### Module 8: Meal Pausing

**Base Path**: `/api/meals`

#### POST /api/meals/pause

**Purpose**: Pause specific meal for today or tomorrow

**Authentication**: Required

**Request Body**:

```json
{
  "date": "2025-01-15",
  "mealType": "lunch"
}
```

**Validation**:

- `date`: Required, ISO format, must be today or tomorrow (in IST)
- `mealType`: Required, one of ['breakfast', 'lunch', 'dinner', 'snacks', 'all']

**Business Logic**:

1. Get current time in IST
2. If pausing for today AND current time >= 20:00 (8 PM IST):
   - Return 422 "Cannot pause meals after 8 PM. Please pause before 8 PM IST."
3. Get user's active subscription
4. Check if subscription includes requested meal type
   - If `mealType = 'all'`: Check if any meals exist for date
   - Else: Check if package includes the meal type
5. Generate meals for requested date if not exist (on-demand generation)
6. If `mealType = 'all'`:
   - Update all meals for that date: Set `isPaused = true`
   - Create `meal_pauses` record with `mealType = 'all'`
7. Else:
   - Update specific meal: Set `isPaused = true`
   - Create `meal_pauses` record with specific `mealType`
8. Create notification: "Your {mealType} for {date} has been paused"

**Response (200)**:

```json
{
  "message": "Meal paused successfully"
}
```

**Errors**:

- 422 if past 8 PM and pausing today
- 422 if date not in allowed range (today/tomorrow)
- 422 if no active subscription
- 422 if meal already paused
- 404 if subscription doesn't include requested meal type

#### POST /api/meals/unpause

**Purpose**: Unpause previously paused meal

**Authentication**: Required

**Request Body**:

```json
{
  "date": "2025-01-15",
  "mealType": "lunch"
}
```

**Validation**: Same as pause

**Business Logic**:

1. Same time check (before 8 PM for today)
2. Update meal(s): Set `isPaused = false`
3. Keep `meal_pauses` record for audit (don't delete)
4. Create notification: "Your {mealType} for {date} has been resumed"

**Response (200)**:

```json
{
  "message": "Meal resumed successfully"
}
```

**Errors**: Same as pause endpoint

---

### Module 9: Curry Token System

**Base Path**: `/api/curry`

#### GET /api/curry/packages

**Purpose**: Get available curry token packages

**Authentication**: Required

**Query Parameters**:

- `diet` (optional): Filter by diet type ['veg', 'non_veg']

**Response (200)**:

```json
{
  "data": {
    "packages": [
      {
        "id": "uuid",
        "name": "Veg Curry 10-Pack",
        "dietType": "veg",
        "tokenCount": 10,
        "validityDays": 30,
        "price": 500.0
      }
    ]
  }
}
```

**Logic**:

- Return packages where `isActive = true`
- Apply diet filter if provided
- Order by price ascending

#### POST /api/curry/purchase

**Purpose**: Purchase curry token package

**Authentication**: Required

**Request Body**:

```json
{
  "packageId": "uuid"
}
```

**Validation**:

- `packageId`: Required, must exist and be active

**Business Logic**:

1. Fetch package details
2. Check if user has existing wallet for this `dietType`
3. Calculate `validUntil = currentDateIST + package.validityDays`
4. If wallet exists:
   - Add `package.tokenCount` to existing `totalTokens`
   - Update `validUntil` to new date (extend validity)
5. If wallet doesn't exist:
   - Create new `user_curry_wallets` record
   - Set `totalTokens = package.tokenCount`
   - Set `usedTokens = 0`
   - Set `validUntil`
6. Create notification: "You have purchased {tokenCount} curry tokens"

**Response (201)**:

```json
{
  "data": {
    "wallet": {
      "id": "uuid",
      "dietType": "veg",
      "totalTokens": 10,
      "usedTokens": 0,
      "remainingTokens": 10,
      "validUntil": "2025-02-14"
    }
  },
  "message": "Curry tokens purchased successfully"
}
```

**Errors**:

- 404 if package not found or inactive

#### GET /api/curry/wallet

**Purpose**: Get user's curry token wallets

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "wallets": [
      {
        "id": "uuid",
        "dietType": "veg",
        "totalTokens": 10,
        "usedTokens": 3,
        "remainingTokens": 7,
        "validUntil": "2025-02-14",
        "isExpired": false
      }
    ]
  }
}
```

**Logic**:

- Return all wallets for `req.user.id`
- Calculate `remainingTokens = totalTokens - usedTokens`
- Calculate `isExpired = validUntil < currentDateIST`
- Order by `createdAt DESC`

#### POST /api/curry/order

**Purpose**: Place curry order using tokens

**Authentication**: Required

**Request Body**:

```json
{
  "dietType": "veg",
  "cuisineType": "south_indian",
  "orderDate": "2025-01-15",
  "deliverySlotId": "uuid",
  "groupWithMeal": false
}
```

**Validation**:

- `dietType`: Required, one of ['veg', 'non_veg']
- `cuisineType`: Required, one of ['south_indian', 'north_indian']
- `orderDate`: Required, ISO date, must be today or tomorrow
- `deliverySlotId`: Optional, must exist if provided
- `groupWithMeal`: Optional boolean

**Business Logic**:

1. Get user's wallet for specified `dietType`
2. If no wallet: Return 422 "No curry token wallet found for {dietType}"
3. Check wallet not expired: `validUntil >= currentDateIST`
   - If expired: Return 422 "Your curry tokens have expired"
4. Calculate remaining tokens: `totalTokens - usedTokens`
5. If remaining < 1: Return 422 "Insufficient curry tokens"
6. Check if user already has curry order for this date
   - If exists and status = 'ordered': Return 422 "You already have a curry order for this date"
7. Create `curry_orders` record:
   - Set `userId`, `walletId`, `cuisineType`, `orderDate`
   - Set `status = 'ordered'`
   - Set `deliverySlotId` if provided, else use default lunch slot
8. Increment wallet's `usedTokens` by 1
9. If `groupWithMeal = true`:
   - Get user's subscription meals for `orderDate`
   - Find lunch meal (most common pairing)
   - If found, create delivery group and link both
10. Create notification: "Your curry order for {date} has been placed"

**Response (201)**:

```json
{
  "data": {
    "order": {
      "id": "uuid",
      "cuisineType": "south_indian",
      "orderDate": "2025-01-15",
      "deliverySlot": {
        /* slot details */
      },
      "status": "ordered",
      "remainingTokens": 6
    }
  },
  "message": "Curry order placed successfully"
}
```

**Errors**:

- 422 if no wallet, expired, or insufficient tokens
- 422 if duplicate order for date
- 404 if delivery slot not found

#### GET /api/curry/orders

**Purpose**: Get user's curry order history

**Authentication**: Required

**Query Parameters**:

- `status` (optional): Filter by status ['ordered', 'cancelled', 'fulfilled']

**Response (200)**:

```json
{
  "data": {
    "orders": [
      {
        "id": "uuid",
        "cuisineType": "south_indian",
        "orderDate": "2025-01-15",
        "status": "ordered",
        "deliverySlot": {
          /* slot details */
        },
        "createdAt": "2025-01-14T10:00:00Z"
      }
    ]
  }
}
```

**Logic**:

- Return orders for `req.user.id`
- Apply status filter if provided
- Include delivery slot details
- Order by `orderDate DESC`, then `createdAt DESC`
- Limit to most recent 50

#### DELETE /api/curry/orders/:orderId

**Purpose**: Cancel curry order

**Authentication**: Required

**Business Logic**:

1. Verify order belongs to user
2. Verify order `status = 'ordered'` (can't cancel fulfilled/cancelled)
3. Verify `orderDate >= currentDateIST` (can't cancel past orders)
4. Update order: Set `status = 'cancelled'`
5. Refund token: Decrement wallet's `usedTokens` by 1
6. Create notification: "Your curry order for {date} has been cancelled"

**Response (200)**:

```json
{
  "message": "Curry order cancelled successfully"
}
```

**Errors**:

- 403 if order doesn't belong to user
- 404 if order not found
- 422 if order already fulfilled/cancelled or date passed

---

### Module 10: Upgrades

**Base Path**: `/api/subscriptions`

#### GET /api/subscriptions/:id/upgrades

**Purpose**: Get available upgrade options for a subscription.

**Authentication**: Required

**Response (200)**:

```json
{
  "data": {
    "upgrades": [
      {
        "id": "uuid",
        "name": "Upgrade to Premium",
        "price": 100.0,
        "fromTier": "REGULAR",
        "toTier": "PREMIUM"
      }
    ]
  }
}
```

#### POST /api/subscriptions/:id/upgrade

**Purpose**: Apply an upgrade (Tier, Diet, Cuisine) or Add Meals to an active subscription.

**Authentication**: Required

**Request Body**:

```json
{
  "targetTier": "PREMIUM", // Optional
  "targetDiet": "non_veg", // Optional
  "targetCuisine": "north", // Optional
  "scope": "WEEK", // MEAL, DAY, WEEK
  "date": "2025-01-20", // Start Date
  "addMeals": ["DINNER"] // Optional array to add specific meals
}
```

**Business Logic**:

1. Validates subscription ownership.
2. Checks `UpgradePrice` table for cost of valid Upgrade (from->to).
3. If `addMeals` is present, adds `SubscriptionMeal` records for the duration.
4. Creates `SubscriptionUpgrade` record.
5. Returns total calculated price and created records.

**Response (201)**:

```json
{
  "data": {
    "upgrade": {
      "id": "uuid",
      "price": 150.0,
      "startDate": "...",
      "endDate": "..."
    },
    "newMeals": 7
  }
}
```

---

### Module 11: Notifications

**Base Path**: `/api/notifications`

#### GET /api/notifications

**Purpose**: Get user's notifications

**Authentication**: Required

**Query Parameters**:

- `unreadOnly` (optional): Boolean, default false

**Response (200)**:

```json
{
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "title": "Subscription Activated",
        "message": "Your subscription has been activated successfully",
        "isRead": false,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Logic**:

- Return notifications for `req.user.id`
- If `unreadOnly = true`: Filter by `isRead = false`
- Calculate `unreadCount` separately (always return total unread)
- Order by `createdAt DESC`
- Limit to most recent 50

#### POST /api/notifications/:notificationId/read

**Purpose**: Mark notification as read

**Authentication**: Required

**Business Logic**:

1. Verify notification belongs to user
2. Update: Set `isRead = true`

**Response (200)**:

```json
{
  "message": "Notification marked as read"
}
```

**Errors**:

- 403 if notification doesn't belong to user
- 404 if notification not found

#### POST /api/notifications/read-all

**Purpose**: Mark all notifications as read

**Authentication**: Required

**Business Logic**:

- Update all user's notifications: Set `isRead = true`

**Response (200)**:

```json
{
  "message": "All notifications marked as read"
}
```

---

### Module 12: Admin Management

**Base Path**: `/api/admin`

#### POST /api/admin/package-pricing

**Purpose**: Create a new pricing option for a Meal Package

**Request Body**:

```json
{
  "mealPackageId": "uuid",
  "name": "Weekly Tiffin",
  "durationDays": 7,
  "mealsIncluded": ["TIFFIN"],
  "price": 500.0
}
```

#### POST /api/admin/categories

**Purpose**: Create a menu category (e.g. "Main Course", "Starters")

**Request Body**:

```json
{
  "name": "Curries",
  "parentId": "optional_uuid_of_parent"
}
```

#### POST /api/admin/menu-items

**Purpose**: Create a global menu item

**Request Body**:

```json
{
  "name": "Paneer Butter Masala",
  "categoryId": "uuid",
  "description": "Rich tomato gravy..."
}
```

#### POST /api/admin/curry-packages

**Purpose**: Create a curry token package

**Request Body**:

```json
{
  "name": "Veg 10 Pack",
  "dietType": "veg",
  "tokenCount": 10,
  "validityDays": 30,
  "price": 450.0
}
```

#### GET /api/admin/time-slots

**Purpose**: List all delivery time slots.

**Response**:

```json
{
  "data": {
    "timeSlots": [
      {
        "id": "uuid",
        "name": "Lunch Slot",
        "startTime": "12:00:00",
        "endTime": "13:00:00",
        "isActive": true
      }
    ]
  }
}
```

#### POST /api/admin/time-slots

**Purpose**: Create a new delivery time slot.

**Request Body**:

```json
{
  "name": "Dinner Slot",
  "startTime": "2023-01-01T19:00:00.000Z",
  "endTime": "2023-01-01T20:00:00.000Z"
}
```

#### PUT /api/admin/time-slots/:id

**Purpose**: Update a delivery time slot.

**Request Body**:

```json
{
  "name": "Updated Slot Name",
  "isActive": false
}
```

#### DELETE /api/admin/time-slots/:id

**Purpose**: Deactivate a delivery time slot.

#### GET /api/admin/common-points

**Purpose**: List all common points for admin review.

**Response**:

```json
{
  "data": {
    "commonPoints": [
      {
        "id": "uuid",
        "name": "Tech Park",
        "city": "Hyderabad"
      }
    ]
  }
}
```

#### GET /api/admin/addresses

**Purpose**: List all user addresses.

**Response**:

```json
{
  "data": {
    "addresses": [
      {
        "id": "uuid",
        "user": { "name": "John Doe", "phoneNumber": "..." },
        "addressLine1": "..."
      }
    ]
  }
}
```

#### PUT /api/admin/addresses/:id

**Purpose**: Update any address (admin override).

#### DELETE /api/admin/addresses/:id

**Purpose**: Delete an address (if not linked to active subscription).

## Implementation File Structure

### Controllers Layer (`src/controllers/`)

Each controller handles HTTP request/response for one module:

- `authController.js` - POST /auth/login, PUT /auth/profile
- `addressController.js` - CRUD for addresses, GET common points
- `mealPackageController.js` - Browse and view meal packages
- `menuController.js` - Get weekly menus
- `subscriptionController.js` - Create subscription, view active/history
- `mealController.js` - Get schedule, pause/unpause meals
- `deliveryController.js` - Get slots, group meals, change delivery time
- `curryController.js` - Browse packages, purchase, order, wallet, cancel
- `upgradeController.js` - Get prices, apply upgrade, view/remove upgrades
- `notificationController.js` - Get notifications, mark read

**Controller Pattern**:

- Extract req.body, req.params, req.query
- Validate using express-validator
- Call service layer method
- Return JSON response
- Use try-catch to pass errors to centralized middleware

### Services Layer (`src/services/`)

Business logic implementation:

- `authService.js` - Find/create user, update profile
- `addressService.js` - CRUD addresses, search common points, primary address logic
- `mealPackageService.js` - Fetch packages with filters
- `menuService.js` - Calculate week dates, fetch menus
- `subscriptionService.js` - Create subscription, calculate end date, check active subscription
- `mealService.js` - **On-demand meal generation**, pause logic, 8 PM check
- `deliveryService.js` - Delivery grouping, slot management
- `curryService.js` - Purchase tokens, place orders, refund logic
- `upgradeService.js` - Validate upgrades, calculate prices
- `notificationService.js` - Create notifications, mark read (helper for other services)

**Service Pattern**:

- Accept data objects as parameters
- Use Prisma client for database operations
- Return data objects or throw errors
- Handle all business logic and validations
- Use timezone utils for date operations

### Routes Layer (`src/routes/`)

Express route definitions:

- `authRoutes.js`
- `addressRoutes.js`
- `mealPackageRoutes.js`
- `menuRoutes.js`
- `subscriptionRoutes.js`
- `mealRoutes.js`
- `deliveryRoutes.js`
- `curryRoutes.js`
- `upgradeRoutes.js`
- `notificationRoutes.js`

**Route Pattern**:

```javascript
// Example structure
const express = require("express");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const controller = require("../controllers/subscriptionController");
const { subscriptionValidation } = require("../middleware/validators");

const router = express.Router();

// All routes protected by auth middleware
router.post(
  "/subscriptions",
  authenticate,
  validate(subscriptionValidation.create),
  controller.createSubscription
);

module.exports = router;
```

### Middleware Layer (`src/middleware/`)

- `auth.ts` - Firebase token verification, user attachment
- `errorHandler.ts` - Centralized error middleware
- `validate.ts` - express-validator wrapper
- `validators/` - Validation schemas for each route:
  - `addressValidators.ts`
  - `subscriptionValidators.ts`
  - `mealValidators.ts`
  - `curryValidators.ts`
  - `upgradeValidators.ts`

**Error Handler Middleware** (`src/middleware/errorHandler.ts`):

- Catches all thrown errors
- Formats Prisma errors (unique constraint, foreign key, etc.)
- Formats validation errors from express-validator
- Returns consistent JSON error response
- Logs errors to console (for debugging)

### Module 12: Admin Management (Updated)

**Base Path**: `/api/admin`

#### PATCH /api/admin/users/:id/status

**Purpose**: Activate or Deactivate a user account.

**Request Body**:

```json
{
  "isActive": false
}
```

#### PATCH /api/admin/meal-packages/:id/status

**Purpose**: Activate or Deactivate a meal package.

**Request Body**:

```json
{
  "isActive": false
}
```

#### PUT /api/admin/meal-packages/:id

**Purpose**: Update a meal package details.

#### DELETE /api/admin/meal-packages/:id

**Purpose**: Soft delete a meal package (set isActive = false).

#### POST /api/admin/upgrades

**Purpose**: Define a pricing rule for upgrades (e.g. Regular -> Premium).

**Request Body**:

```json
{
  "name": "Upgrade: Regular to Premium",
  "fromTier": "REGULAR",
  "toTier": "PREMIUM",
  "fromDiet": "veg",
  "toDiet": "non_veg", // Optional
  "scope": "WEEK", // MEAL, DAY, WEEK
  "price": 300.0
}
```

#### PUT /api/admin/upgrades/:id

#### DELETE /api/admin/upgrades/:id

(Other Admin endpoints remain as previously defined...)

#### POST /api/admin/users

**Purpose**: Create a new user (admin or regular).

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "securepassword", // Will be hashed
  "name": "New User",
  "phoneNumber": "...",
  "role": "USER" // or ADMIN
}
```

#### DELETE /api/admin/users/:id

**Purpose**: Deactivate (Soft Delete) a user.

#### GET /api/admin/users

**Purpose**: List all users.

**Response**:

```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "...",
        "isActive": true
      }
    ]
  }
}
```

---

### Module 13: Issue Tracking

**Base Path**: `/api/issues`

#### POST /api/issues

**Purpose**: User reports an issue.

**Authentication**: Required

**Request Body**:

```json
{
  "category": "delivery", // e.g. delivery, food_quality, app
  "description": "Delivery was late today."
}
```

#### GET /api/issues/my-issues

**Purpose**: User views their reported issues.

**Authentication**: Required

#### GET /api/issues/all

**Purpose**: Admin views all issues.

**Authentication**: Admin Required

#### PUT /api/issues/:id

**Purpose**: Admin resolves or updates an issue.

**Authentication**: Admin Required

**Request Body**:

```json
{
  "status": "resolved",
  "resolution": "Refund processed to wallet."
}
```

---

### Module 14: Master Data (Address)

**Base Path**: `/api/master-data`

#### GET /api/master-data/states

**Purpose**: Get all states (Public/Auth).

#### GET /api/master-data/states/:stateId/districts

**Purpose**: Get districts for a state.

#### GET /api/master-data/districts/:districtId/pincodes

**Purpose**: Get pincodes for a district.

#### POST /api/master-data/states (Admin)

**Purpose**: Create a state.

**Request Body**: `{ "name": "Karnataka" }`

#### POST /api/master-data/districts (Admin)

**Purpose**: Create a district.

**Request Body**: `{ "name": "Bangalore Urban", "stateId": "uuid" }`

#### POST /api/master-data/pincodes (Admin)

**Purpose**: Create a pincode.

**Request Body**: `{ "code": "560001", "districtId": "uuid" }`

---

### Module 15: Payment System (Manual Verification)

**Base Path**: `/api/payment` (User) and `/api/admin` (Admin)

#### POST /api/payment/submit

**Purpose**: User submits proof of payment (Screenshot + UTR).

**Authentication**: Required

**Request Headers**: `Content-Type: multipart/form-data`

**Request Body**:

- `screenshot`: File (Image) ?? OR `screenshotUrl`: "string" (if cloud uploaded)
- `subscriptionId`: "uuid" (Optional)
- `curryTokenPackageId`: "uuid" (Optional)
- `subscriptionUpgradeId`: "uuid" (Optional - New)
- `amount`: "1500.00"
- `transactionId`: "UTR123456789"
- `payerName`: "John Doe" (Optional)

**Response**:

```json
{
  "data": {
    "proof": {
      "id": "uuid",
      "status": "PENDING",
      "screenshotUrl": "https://res.cloudinary.com/..."
    }
  },
  "message": "Payment submitted successfully. Pending verification."
}
```

#### GET /api/payment/config

**Purpose**: Get admin's payment details (Bank/UPI) for the user to make a transfer.

**Authentication**: Required

**Response**:

```json
{
  "data": {
    "details": {
      "bankName": "HDFC",
      "accountNumber": "...",
      "qrCodeUrl": "..."
    }
  }
}
```

#### POST /api/admin/payment-details

**Purpose**: Admin configures bank/UPI details and QR code.

**Authentication**: Admin Required

**Request Body**:

```json
{
  "bankName": "HDFC Bank",
  "accountNumber": "1234567890",
  "ifscCode": "HDFC0001234",
  "accountHolderName": "Vyanjo Foods",
  "upiId": "vyanjo@hdfc",
  "qrCodeUrl": "https://cloudinary.com/..."
}
```

#### GET /api/admin/payments

**Purpose**: Admin views list of payment proofs.

**Authentication**: Admin Required

**Query Params**: `?status=PENDING` (or VERIFIED, REJECTED)

**Response**:

```json
{
  "data": {
    "proofs": [
      {
        "id": "uuid",
        "status": "PENDING",
        "user": { "name": "John" },
        "amount": "1500",
        "screenshotUrl": "..."
      }
    ]
  }
}
```

#### POST /api/admin/payments/:id/verify

**Purpose**: Verify a payment proof and **activate** the linked service (Subscription, Upgrade, or Curry Token Wallet).

**Authentication**: Admin Required

**Response**:

```json
{
  "message": "Payment verified and subscription activated"
}
```

#### POST /api/admin/payments/:id/reject

**Purpose**: Reject a payment proof.

**Authentication**: Admin Required

**Response**:

```json
{
  "message": "Payment rejected"
}
```

---

### Utilities (`src/utils/`)

- `timezone.js` - IST timezone helpers:

  ```javascript
  function getCurrentISTTime()
  function isBeforePauseDeadline()
  function convertToIST(date)
  function getTodayIST()
  function getTomorrowIST()
  function calculateWeekStart(date)
  ```

- `prisma.js` - Prisma client singleton:

  ```javascript
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  module.exports = prisma;
  ```

- `responseFormatter.js` - Helpers for consistent responses:
  ```javascript
  function successResponse(data, message)
  function errorResponse(message, code, status)
  ```

### Configuration (`src/config/`)

- `firebase.js` - Firebase Admin SDK initialization:

  ```javascript
  const admin = require("firebase-admin");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  module.exports = admin;
  ```

### Entry Point (`src/index.js`)

Main server file:

```javascript
const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/errorHandler");

// Import all routes
const authRoutes = require("./routes/authRoutes");
const addressRoutes = require("./routes/addressRoutes");
const mealPackageRoutes = require("./routes/mealPackageRoutes");
const menuRoutes = require("./routes/menuRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const mealRoutes = require("./routes/mealRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const curryRoutes = require("./routes/curryRoutes");
const upgradeRoutes = require("./routes/upgradeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api", addressRoutes);
app.use("/api", mealPackageRoutes);
app.use("/api", menuRoutes);
app.use("/api", subscriptionRoutes);
app.use("/api", mealRoutes);
app.use("/api", deliveryRoutes);
app.use("/api", curryRoutes);
app.use("/api", upgradeRoutes);
app.use("/api", notificationRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Package Dependencies

### package.json

```json
{
  "name": "vyanjo-backend",
  "version": "1.0.0",
  "description": "Meal and curry subscription backend",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@prisma/client": "^5.7.0",
    "firebase-admin": "^12.0.0",
    "express-validator": "^7.0.1",
    "moment-timezone": "^0.5.44"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0",
    "prisma": "^5.7.0"
  }
}
```

**Key Dependencies**:

- `express` - Web framework
- `@prisma/client` - Generated Prisma client
- `firebase-admin` - Firebase auth verification
- `express-validator` - Request validation
- `moment-timezone` - IST timezone handling
- `cors` - CORS middleware

**Dev Dependencies**:

- `typescript` - TypeScript compiler
- `prisma` - Prisma CLI
- `ts-node-dev` - Development server with hot reload

---

## Environment Variables

### .env.example

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vyanjo_db?schema=public"

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

**Setup Instructions**:

1. Copy `.env.example` to `.env`
2. Update `DATABASE_URL` with actual PostgreSQL connection string
3. Create Firebase service account in Firebase Console
4. Download service account JSON
5. Extract `project_id`, `private_key`, `client_email` and add to `.env`

---

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Initial Data Seeding

### Required Seed Data

**File**: `prisma/seed.ts` (optional, for development/testing)

**Must seed before system can function**:

1. **Delivery Time Slots** (required for meal generation):

   ```typescript
   // Create default delivery slots
   await prisma.deliveryTimeSlot.createMany({
     data: [
       {
         name: "Morning Slot",
         startTime: "07:00:00",
         endTime: "08:00:00",
         isActive: true,
       },
       {
         name: "Afternoon Slot",
         startTime: "12:00:00",
         endTime: "13:00:00",
         isActive: true,
       },
       {
         name: "Evening Snack Slot",
         startTime: "17:00:00",
         endTime: "18:00:00",
         isActive: true,
       },
       {
         name: "Dinner Slot",
         startTime: "19:00:00",
         endTime: "20:00:00",
         isActive: true,
       },
     ],
   });
   ```

2. **Meal Packages** (at least one for testing):

   ```typescript
   await prisma.mealPackage.create({
     data: {
       name: "South Indian Veg Weekly",
       dietType: "veg",
       cuisineType: "south_indian",
       includesBreakfast: true,
       includesLunch: true,
       includesDinner: true,
       includesSnacks: false,
       durationDays: 7,
       defaultContainer: "steel",
       allowsContainerChoice: true,
       allowsDietUpgrade: false,
       allowsCuisineUpgrade: true,
       price: 1200.0,
       isActive: true,
     },
   });
   ```

3. **Curry Token Packages**:

   ```typescript
   await prisma.curryTokenPackage.createMany({
     data: [
       {
         name: "Veg Curry 10-Pack",
         dietType: "veg",
         tokenCount: 10,
         validityDays: 30,
         price: 500.0,
         isActive: true,
       },
       {
         name: "Non-Veg Curry 10-Pack",
         dietType: "non_veg",
         tokenCount: 10,
         validityDays: 30,
         price: 700.0,
         isActive: true,
       },
     ],
   });
   ```

4. **Upgrade Prices**:

   ```typescript
   await prisma.upgradePrice.createMany({
     data: [
       {
         upgradeType: "veg_to_nonveg",
         scope: "meal",
         mealType: "lunch",
         price: 50.0,
         isActive: true,
       },
       {
         upgradeType: "veg_to_nonveg",
         scope: "day",
         mealType: null,
         price: 100.0,
         isActive: true,
       },
       {
         upgradeType: "south_to_north",
         scope: "day",
         mealType: null,
         price: 80.0,
         isActive: true,
       },
     ],
   });
   ```

5. **Weekly Menus** (for current week):

   ```typescript
   const currentWeekStart = // Calculate Monday of current week
   const menu = await prisma.weeklyMenu.create({
     data: {
       dietType: 'veg',
       cuisineType: 'south_indian',
       weekStartDate: currentWeekStart,
     },
   });

   await prisma.weeklyMenuItem.createMany({
     data: [
       { weeklyMenuId: menu.id, itemType: 'breakfast', itemName: 'Idli, Sambar, Chutney' },
       { weeklyMenuId: menu.id, itemType: 'lunch', itemName: 'Rice, Dal, Rasam, Vegetable Curry' },
       { weeklyMenuId: menu.id, itemType: 'dinner', itemName: 'Chapati, Paneer Curry, Rice' },
     ],
   });
   ```

**Seed Command**: Add to package.json:

```json
"scripts": {
  "seed": "ts-node prisma/seed.ts"
}
```

---

## Critical Business Logic Implementation Notes

### 1. On-Demand Meal Generation

**Location**: `src/services/mealService.ts`

**Function**: `generateMealsIfNeeded(subscriptionId, dates)`

**Logic**:

1. Check if `subscription_meals` exist for given dates
2. If not, fetch subscription details with meal package
3. For each date:
   - For each included meal type (breakfast/lunch/dinner/snacks):
     - Create `subscription_meals` row
     - Assign default `deliverySlotId` based on meal type
     - Query `delivery_time_slots` to get slot ID
4. Return generated meals

**Called from**:

- `GET /api/meals/schedule`
- `POST /api/meals/pause`
- `POST /api/meals/unpause`

### 2. 8 PM Pause Deadline Check

**Location**: `src/utils/timezone.ts`

**Function**: `isBeforePauseDeadline()`

```typescript
export function isBeforePauseDeadline(): boolean {
  const now = moment().tz("Asia/Kolkata");
  const hour = now.hour();
  return hour < 20; // Before 8 PM
}
```

**Usage**:

- In `POST /meals/pause` and `POST /meals/unpause`
- Only enforce for same-day pauses
- Tomorrow pauses allowed anytime

### 3. Active Subscription Uniqueness

**Location**: `src/services/subscriptionService.ts`

**Function**: `createSubscription()`

**Logic**:

1. Query: `prisma.subscription.findFirst({ where: { userId, status: 'active' } })`
2. If found: Throw error "You already have an active subscription"
3. Database partial unique index provides backup enforcement

### 4. Notification Creation Helper

**Location**: `src/services/notificationService.ts`

**Function**: `createNotification(userId, title, message)`

**Usage**: Called from various services:

- Subscription creation
- Meal pause/unpause
- Curry purchase/order
- Upgrade application

Keeps notification logic centralized and consistent.

---

## Development Workflow

### Initial Setup Steps

1. **Clone repository**
2. **Install dependencies**: `npm install`
3. **Setup environment**: Copy `.env.example` to `.env`, fill values
4. **Setup database**: Create PostgreSQL database
5. **Run migrations**: `npm run prisma:migrate`
6. **Generate Prisma client**: `npm run prisma:generate`
7. **Seed data**: `npm run seed` (after creating seed file)
8. **Start dev server**: `npm run dev`

### Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:migrate` - Create and apply migrations
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Migration Workflow

When making schema changes:

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Prisma generates migration SQL and updates client
4. Migration applied automatically in dev

---

## Testing Approach

**Manual Testing Recommended** (no automated tests specified, but good to plan for)

### Test Flow Sequence

1. **Auth Flow**:

   - Authenticate with Firebase (external)
   - Call `POST /api/auth/login` with token
   - Verify user created/returned

2. **Address Setup**:

   - Create address: `POST /api/addresses`
   - Verify primary address set
   - Get addresses: `GET /api/addresses`

3. **Browse & Subscribe**:

   - Get packages: `GET /api/meal-packages`
   - Create subscription: `POST /api/subscriptions`
   - Get active subscription: `GET /api/subscriptions/active`

4. **View Schedule**:

   - Get meals: `GET /api/meals/schedule`
   - Verify meals generated on-demand
   - Check delivery slots assigned

5. **Pause Meal**:

   - Pause tomorrow's lunch: `POST /api/meals/pause`
   - Verify meal marked as paused
   - Verify notification created

6. **Curry Tokens**:

   - Purchase tokens: `POST /api/curry/purchase`
   - Check wallet: `GET /api/curry/wallet`
   - Place order: `POST /api/curry/order`
   - Verify token deducted

7. **Upgrades**:

   - Get prices: `GET /api/upgrades/prices`
   - Apply upgrade: `POST /api/upgrades/apply`
   - Verify upgrade created

8. **Notifications**:
   - Get notifications: `GET /api/notifications`
   - Verify all events created notifications
   - Mark as read: `POST /api/notifications/:id/read`

### Postman Collection

Create Postman collection with:

- Environment variables for `BASE_URL` and `AUTH_TOKEN`
- All endpoints documented above
- Example requests and expected responses
- Test scripts to verify response structure

---

## Deployment Considerations

### Production Requirements

1. **Environment Variables**: Set all required env vars on hosting platform
2. **Database**: PostgreSQL instance (e.g., Supabase, Railway, AWS RDS)
3. **Firebase**: Production Firebase project with service account
4. **Run migrations**: `npx prisma migrate deploy` (production-safe)
5. **Start server**: `npm start`

### Environment-Specific Config

- **Development**: Use `NODE_ENV=development`, verbose logging
- **Production**: Use `NODE_ENV=production`, error logging only, enable CORS restrictions

### Health Check

- Endpoint: `GET /health`
- Returns: `{ "status": "ok", "timestamp": "..." }`
- Use for load balancer health checks

---

## Summary

This backend system provides:

- ✅ Complete meal subscription management
- ✅ Curry token-based ordering system
- ✅ Flexible delivery scheduling and grouping
- ✅ Meal pausing with 8 PM deadline enforcement
- ✅ Temporary upgrades (diet/cuisine)
- ✅ In-app notifications
- ✅ Firebase phone authentication
- ✅ IST timezone support throughout
- ✅ On-demand meal generation (optimized performance)
- ✅ One active subscription per user (enforced)
- ✅ 48-hour scheduling window (today + tomorrow)

**Total API Endpoints**: ~40 endpoints across 11 modules
**Database Tables**: 17 tables with full relational integrity
**External Dependencies**: Firebase Admin SDK only
