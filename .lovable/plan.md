

# Wallet, Mobile App & Subscription Tiers

## Overview

Three features requested. Two are implementable (Wallet, Subscription Tiers). One requires clarification (Mobile App).

---

## Feature 1: Doctor Wallet System

### Database Changes (Migration)
- **`wallets` table**: `id`, `user_id` (unique), `balance` (numeric, default 0), `deposit_required_after` (timestamptz, set to created_at + 7 days), `deposit_amount` (100), `deposit_paid_at`, `withdrawal_eligible_after` (deposit_paid_at + 3 months), `created_at`, `updated_at`
- **`wallet_transactions` table**: `id`, `wallet_id`, `type` (enum: deposit, withdrawal, hold, refund), `amount`, `description`, `order_id` (nullable), `created_at`
- **RLS**: Doctors see only their own wallet/transactions. Admins see all.
- **Trigger**: Auto-create wallet row on profile completion for doctors (via `complete_onboarding` function update).

### Frontend
- **`src/pages/Wallet.tsx`**: Shows balance, deposit status, transaction history, deposit/withdraw buttons.
- **Deposit prompt component**: Banner on Dashboard after 7 days if no deposit made, linking to Wallet page.
- **Route**: `/wallet` (protected, doctor-only).
- **Dashboard integration**: Wallet balance card in doctor dashboard.

---

## Feature 2: Mobile App

Lovable builds React web apps, not native mobile apps. However, the project already has PWA support (service worker, install page, offline banner). The current PWA **is** the mobile app strategy.

**No code changes needed** -- the existing `/install` page and PWA infrastructure already provide the "app on phone" experience. If a truly native app (React Native, Flutter) is needed, that falls outside Lovable's scope.

---

## Feature 3: Hybrid Subscription Tiers

### Database Changes (Migration)
- **`subscription_plans` table** (reference/seed data): `id`, `name` (Basic/Silver/Gold/Platinum), `monthly_fee` (500/700/1200/5000), `per_order_fee` (15/10/7/0), `is_active`, `created_at`
- **`doctor_subscriptions` table**: `id`, `doctor_id`, `plan_id` (FK to subscription_plans), `status` (active/cancelled/past_due), `started_at`, `current_period_start`, `current_period_end`, `created_at`, `updated_at`
- **RLS**: Doctors see own subscription. Admins see all.
- Seed the 4 plans via insert tool (not migration).

### Frontend
- **`src/pages/SubscriptionPlans.tsx`**: Pricing cards for the 4 tiers with select/upgrade buttons.
- **Dashboard integration**: Current plan badge + per-order fee indicator.
- **Order creation hook**: After order is created, log a `wallet_transactions` entry for the per-order fee based on the doctor's active plan.

### Per-Order Fee Logic
- Update `create-order` edge function to check the doctor's active subscription plan and deduct the per-order fee from their wallet balance. If insufficient balance, block order creation with a clear error.

---

## Technical Details

### Files to Create
1. `src/pages/Wallet.tsx` -- wallet dashboard
2. `src/pages/SubscriptionPlans.tsx` -- pricing/plan selection page
3. `src/components/wallet/DepositPromptBanner.tsx` -- 7-day deposit reminder
4. `src/components/wallet/TransactionHistory.tsx` -- transaction list
5. `src/components/subscription/PlanCard.tsx` -- individual plan card
6. Migration SQL for `wallets`, `wallet_transactions`, `subscription_plans`, `doctor_subscriptions` tables

### Files to Modify
1. `src/App.tsx` -- add `/wallet` and `/plans` routes
2. `src/pages/Dashboard.tsx` -- add wallet balance card + deposit banner + plan badge
3. `supabase/functions/create-order/index.ts` -- deduct per-order fee from wallet
4. `supabase/functions/onboarding-complete/index.ts` -- create wallet on doctor signup
5. `src/components/landing/LandingNav.tsx` -- add Wallet nav item for doctors
6. `src/components/layout/MobileBottomNav.tsx` -- add wallet quick access

### Order of Implementation
1. Database migration (all 4 tables + RLS + triggers)
2. Seed subscription plans
3. Wallet page + components
4. Subscription plans page
5. Dashboard integration (banner, badges)
6. Edge function updates (per-order fee deduction, wallet creation)
7. Route registration

