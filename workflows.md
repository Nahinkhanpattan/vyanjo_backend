# System Workflows

## 1. Subscription Upgrades Workflow

This workflow enables users to upgrade their current subscription plan (e.g., Change Diet, Tier, Cuisine) or add meals.

### A. Admin Setup (One-time / Maintenance)

Admins define the rules and pricing for upgrades.

**1. Create Upgrade Rule**

- **Endpoint:** `POST /api/admin/upgrades`
- **Purpose:** Define cost for a specific transition (e.g., Regular -> Premium).
- **Payload:**
  ```json
  {
    "name": "Upgrade to Premium",
    "fromTier": "REGULAR",
    "toTier": "PREMIUM",
    "scope": "SUBSCRIPTION_REMAINING",
    "price": 500.0
  }
  ```

### B. User Flow

**1. View Available Upgrades / Plans**

- **Endpoint:** `GET /api/subscriptions/{subscriptionId}/upgrades`
- **Response:** List of applicable upgrade options with prices, OR available `PackagePricing` options.

**2. Request Upgrade (Full Plan Switch)**

- **Endpoint:** `POST /api/subscriptions/{subscriptionId}/upgrade`
- **Purpose:** Switch from current plan (e.g., 1-Day Tiffin) to a new plan (e.g., 3-Day Tiffin+Lunch Non-Veg).
- **Payload:**
  ```json
  {
    "targetPricingId": "uuid-of-3-day-nonveg-plan",
    "scope": "SUBSCRIPTION_REMAINING",
    "date": "2023-10-25"
  }
  ```
- **Response:** Returns an `Upgrade` object with status `PENDING`. Price matches the new plan cost.

**3. Request Upgrade (Partial / Attribute)**

- **Endpoint:** `POST /api/subscriptions/{subscriptionId}/upgrade`
- **Purpose:** Modify specific attribute (e.g. Diet) or add meals.
- **Payload:**
  ```json
  {
    "targetTier": "PREMIUM",
    "scope": "SUBSCRIPTION_REMAINING",
    "date": "2023-10-25"
  }
  ```

**4. Make Payment**

- **Endpoint:** `POST /api/payment/submit`
- **Purpose:** Upload payment screenshot linked to the upgrade.
- **Payload:**
  ```json
  {
    "subscriptionUpgradeId": "upgrade-uuid",
    "amount": 500.0,
    "screenshotUrl": "https://...",
    "transactionId": "UTR12345"
  }
  ```

### C. Admin Verification

**1. View Pending Payments**

- **Endpoint:** `GET /api/admin/payments?status=PENDING`

**2. Verify & Activate**

- **Endpoint:** `POST /api/admin/payments/{paymentProofId}/verify`
- **Result:**
  - Payment Proof status -> `VERIFIED`
  - Subscription Upgrade status -> `ACTIVE`
  - (Optional) Subscription details updated.

---

## 2. Curry Tokens Workflow

This workflow allows users to purchase "Curry Tokens" which can be exchanged for ad-hoc curry deliveries.

### A. Admin Setup

**1. Create Token Package**

- **Endpoint:** `POST /api/admin/curry-packages`
- **Payload:**
  ```json
  {
    "name": "Veg Curry 10-Pack",
    "dietType": "veg",
    "tokenCount": 10,
    "validityDays": 30,
    "price": 1000.0
  }
  ```

### B. Purchase Flow (User)

**1. View Packages**

- **Endpoint:** `GET /api/curry/packages`

**2. Submit Payment (Purchase)**

- **Endpoint:** `POST /api/payment/submit`
- **Purpose:** Buy the package.
- **Payload:**
  ```json
  {
    "curryTokenPackageId": "package-uuid",
    "amount": 1000.0,
    "screenshotUrl": "https://...",
    "transactionId": "UTR99999"
  }
  ```

### C. Admin Verification

**1. Verify Payment**

- **Endpoint:** `POST /api/admin/payments/{paymentProofId}/verify`
- **Action:** System automatically credits the tokens to the user's `CurryWallet`.

### D. Usage Flow (User)

**1. View Wallet Balance**

- **Endpoint:** `GET /api/curry/wallet`
- **Response:** `{ "totalTokens": 10, "usedTokens": 0 ... }`

**2. Place Curry Order**

- **Endpoint:** `POST /api/curry/order`
- **Purpose:** Redeem 1 token for a curry delivery.
- **Payload:**
  ```json
  {
    "dietType": "veg",
    "cuisineType": "south_indian",
    "orderDate": "2023-10-26"
  }
  ```
- **Result:** Wallet balance decreases by 1. Order created with status `ordered`.
