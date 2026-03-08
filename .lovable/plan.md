

# Mobile & Tablet UX Optimization Plan

## Current State
The project already has solid mobile foundations: touch-target utilities (44px min), press-feedback class, stagger-fade-in animations, mobile card views in OrderDashboard, safe-area insets, and responsive breakpoints. However, several gaps remain across navigation, page layouts, and interactive elements.

## Issues to Fix

### 1. Mobile Bottom Navigation Bar
The current mobile navigation relies solely on the hamburger menu (Sheet). For logged-in users on mobile/tablet, a persistent bottom tab bar is the standard for quick access to core destinations (Dashboard, Orders, Notifications, Profile). This eliminates the need to open the hamburger for the most common actions.

**Changes:**
- Create `src/components/layout/MobileBottomNav.tsx` — a fixed bottom nav bar visible only on `lg:hidden` for authenticated users
- Contains 4-5 role-aware tabs: Dashboard, Create/Marketplace, Notifications (with badge), Profile
- Uses safe-area-inset-bottom padding
- Active route highlighting with subtle scale animation
- Add it to `AppContent` in `App.tsx`

### 2. Touch Target Enforcement on Remaining Elements
Several interactive elements still lack the 44px minimum:
- Desktop nav buttons (`h-9 w-9`) in LandingNav need mobile override
- Pagination controls in OrderDashboard
- Filter Select triggers on desktop size still use `sm:min-h-0` which is fine, but some action buttons in cards lack explicit sizing
- Dropdown menu items need minimum height

**Changes:**
- Update `src/index.css` to add a global rule for dropdown menu items minimum height on touch devices
- Audit and patch `Button size="icon"` in LandingNav to use `min-h-[44px] min-w-[44px]` consistently

### 3. Mobile Card Interactions & Micro-interactions
- Order cards in `OrderDashboard.tsx` already have `active:scale-[0.98]` but need haptic-style feedback on the action buttons
- Add ripple-like visual feedback on tap for card interactions
- Add subtle entrance animations to filter/sort controls

**Changes:**
- Add `press-feedback` class to all mobile action buttons in OrderDashboard card view
- Add transition classes to Badge components for status changes
- Ensure dropdown triggers in mobile card view have touch-friendly sizing

### 4. Improved Mobile Filters UX
The filter bar in OrderDashboard stacks vertically on mobile but takes up significant space. Convert to a collapsible filter panel with a single "Filters" button.

**Changes:**
- In `OrderDashboard.tsx`, wrap filter controls in a collapsible section on mobile (`lg:hidden`)
- Show a "Filters" button with active filter count badge
- Desktop view remains unchanged

### 5. Page Layout Spacing & Hierarchy
Several pages have inconsistent mobile padding and heading sizes.

**Changes:**
- Ensure consistent `px-3 sm:px-4 lg:px-6` across all page containers
- Review heading hierarchy: `text-xl sm:text-2xl lg:text-3xl` pattern
- Add subtle dividers between major sections on mobile

### 6. Smooth Page Transitions
The existing `PageTransition` uses framer-motion with opacity+translate+scale. This is fine but can feel heavy on mobile.

**Changes:**
- Simplify mobile page transitions to opacity-only (remove scale/translate on small screens) for better perceived performance
- Update `src/components/ui/page-transition.tsx` with reduced motion on mobile

### 7. Mobile Sheet/Dialog Improvements
- Ensure all Dialog components use `DrawerDialog` pattern (Sheet on mobile, Dialog on desktop) for the most frequently used modals (OrderStatusDialog, OrderQuickView)
- OrderQuickView already exists but verify it's Sheet-based on mobile

**Changes:**
- Update `OrderQuickView` to use Sheet on mobile if not already
- Ensure modal content is scrollable with proper padding

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/layout/MobileBottomNav.tsx` | Persistent bottom tab navigation for mobile |

## Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add MobileBottomNav component |
| `src/index.css` | Add dropdown touch target rules, bottom-nav safe spacing |
| `src/components/ui/page-transition.tsx` | Simplify animations on mobile |
| `src/components/landing/LandingNav.tsx` | Enforce 44px touch targets on all icon buttons |
| `src/components/OrderDashboard.tsx` | Collapsible mobile filters, press-feedback on action buttons |
| `src/components/ui/button.tsx` | Add touch-target enforcement for `icon` size variant on mobile |

## Technical Notes
- Bottom nav uses `useLocation` for active state, `useAuth` for auth gate, `useUserRole` for role-aware tabs
- All animations use CSS transitions (no framer-motion) for the bottom nav to keep it lightweight
- The bottom nav adds `pb-[calc(4rem+env(safe-area-inset-bottom))]` to the body to prevent content from being hidden behind it

