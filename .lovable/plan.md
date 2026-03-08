

# Plan: Theme Restoration, EmptyState Integration, and Offline Banner

## 1. Restore Light Theme as Default

The `ThemeProvider` currently uses `defaultTheme="system"`, which forces dark mode on users with dark system preferences — shifting colors unexpectedly. Fix: change to `defaultTheme="light"` so the original color palette is the default. The dark toggle remains available for users who want it.

**File:** `src/App.tsx`
- Change `defaultTheme="system"` to `defaultTheme="light"`

## 2. Keep Dark Toggle (Already Done)

The `ThemeToggle` in `LandingNav` and the Settings page appearance tab are already functional. No changes needed — they stay as-is.

## 3. Apply EmptyState to 6 Pages

The reusable `EmptyState` component already exists at `src/components/ui/empty-state.tsx`. It needs to be integrated into these pages replacing their ad-hoc empty markup:

| Page | Current Empty State | New CTA |
|------|-------------------|---------|
| `OrderDashboard.tsx` | Inline "No orders found" text | "Create your first order" (doctor) / "Browse marketplace" (lab) |
| `OrdersMarketplace.tsx` (~line 451-462) | Inline Package icon + text | "Check back later" with refresh button |
| `NotificationHistory.tsx` (~line 279-289) | Inline Bell icon + text | "Go to Dashboard" button |
| `ChatHistory.tsx` | Inline empty text | "Start a conversation" → navigate to dashboard |
| `DraftsManager.tsx` | Inline empty text | "Create New Order" button |
| `PatientCases.tsx` | Inline empty text | "Add Patient Case" button |

**For each page:**
- Import `EmptyState` from `@/components/ui/empty-state`
- Replace the existing empty-state JSX block with `<EmptyState icon={...} title="..." description="..." actionLabel="..." onAction={...} />`

## 4. Offline Banner (Already Integrated)

`OfflineBanner` is already rendered in `AppContent` in `App.tsx` and `useNetworkStatus` hook exists. No changes needed.

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | `defaultTheme="light"` |
| `src/components/OrderDashboard.tsx` | Replace empty state with `EmptyState` |
| `src/pages/OrdersMarketplace.tsx` | Replace empty state with `EmptyState` |
| `src/pages/NotificationHistory.tsx` | Replace empty state with `EmptyState` |
| `src/pages/ChatHistory.tsx` | Replace empty state with `EmptyState` |
| `src/pages/DraftsManager.tsx` | Replace empty state with `EmptyState` |
| `src/pages/PatientCases.tsx` | Replace empty state with `EmptyState` |

