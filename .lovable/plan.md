

# Mobile Navigation Audit — Findings & Fix Plan

## Investigation Summary

I thoroughly reviewed the mobile navigation system (`MobileBottomNav.tsx`, `MobileNavSheet.tsx`, `LandingNav.tsx`) and all route definitions in `App.tsx`.

**There is no "map" page or feature in this application.** The closest item is **"Marketplace"** (`/orders-marketplace`), which appears in the mobile bottom nav for `lab_staff` users. If you're seeing a white page, here's what's likely happening:

## Root Cause Analysis

### Scenario 1: Marketplace shows white page for non-lab-staff users
The `OrdersMarketplace.tsx` page is wrapped in `<ProtectedRoute>` but has **no role guard**. If a doctor navigates to `/orders-marketplace` directly (via URL or bookmark), they'll see the page but with no data — the query depends on `labId` which is `null` for doctors. The page renders but shows nothing meaningful.

### Scenario 2: Orphaned pages with no routes
Four page files exist but have **no routes in App.tsx**, meaning navigating to them hits the `*` catch-all (404 NotFound page, which renders fine — not a white page):
- `AppointmentScheduling.tsx`
- `Analytics.tsx`  
- `TrackOrders.tsx`
- `LabCalendar.tsx`

### Scenario 3: `App.css` interferes with layout
The default Vite `App.css` still exists with `#root { max-width: 1280px; padding: 2rem; text-align: center; }` — this constrains the viewport and adds unwanted padding on mobile.

## What's Actually Working ✅
- **MobileBottomNav**: Correctly shows 4 items (Dashboard, New Order/Marketplace, Alerts, Profile)
- **Profile link**: Points to `/profile`, route exists, page is 682 lines of functional content
- **Role-based nav**: Doctors see "New Order", lab staff see "Marketplace"
- **Hidden on public pages**: Correctly hidden on landing, auth, onboarding pages
- **Safe area handling**: Uses `pb-[env(safe-area-inset-bottom)]`

## Fixes Required

### 1. Remove legacy `App.css` styles
The `#root { max-width: 1280px; padding: 2rem }` from the Vite template constrains mobile layout and adds 2rem padding everywhere. This file should be cleaned up.

### 2. Add missing routes to `App.tsx`
Register the 4 orphaned pages so they don't 404:
- `/analytics` → `Analytics`
- `/appointment-scheduling` → `AppointmentScheduling`
- `/track-orders` → `TrackOrders`
- `/lab-calendar` → `LabCalendar`

### 3. Add RoleGuard to OrdersMarketplace
Prevent doctors from landing on a blank marketplace page — restrict to `lab_staff` and `admin` roles.

### 4. Ensure bottom nav padding on page content
The `has-bottom-nav` class is added to body but needs corresponding CSS to add `padding-bottom` so content isn't hidden behind the fixed bottom nav.

## Files to Change
- `src/App.css` — remove legacy Vite styles
- `src/App.tsx` — add 4 missing routes
- `src/pages/OrdersMarketplace.tsx` — add role guard
- `src/index.css` — ensure `has-bottom-nav` padding rule exists

