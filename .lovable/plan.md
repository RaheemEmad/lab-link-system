

# Plan: Mobile Responsiveness, Touch Targets, UI Hierarchy & Micro-Interactions

This is a broad UX improvement pass across the core components that mobile/tablet users interact with most.

## Scope

### 1. Global Touch Target Enforcement

**File**: `src/components/ui/button.tsx`
- Update `sm` size from `h-8` to `h-9` (36px minimum, closer to 44px standard)
- Add `min-h-[44px]` to `icon` size variant for mobile compliance
- The `default` size (`h-10`) already meets 40px — acceptable

### 2. Dashboard Page Mobile Improvements

**File**: `src/pages/Dashboard.tsx`
- Dashboard toolbar buttons grid: increase gap on mobile, ensure `min-h-[44px]` on each button
- Add `active:scale-95 transition-transform` (btn-press) to all toolbar buttons for tactile feedback
- Improve heading hierarchy: add a subtle role-based subtitle below "Order Dashboard" (e.g., "Doctor View" / "Lab View")

### 3. OrderDashboard Mobile Card Enhancements

**File**: `src/components/OrderDashboard.tsx`

**Touch targets**:
- Mobile card action buttons: ensure dropdown trigger has `min-h-[44px] min-w-[44px]`
- Select triggers on filters: add `min-h-[44px]` class
- Search input: already ok (default h-10)

**UI hierarchy**:
- Add a subtle card entrance animation using `animate-fade-in` on each mobile card with staggered delay
- Add `active:scale-[0.98]` on mobile cards for press feedback
- Improve filter section spacing: `gap-3` → `gap-2` on mobile for compactness, keep `gap-3` on `sm:`

**Micro-interactions**:
- Pagination buttons: add `active:scale-95 transition-transform`
- Bulk action toolbar: add `animate-fade-in` entrance

### 4. OrderQuickView Sheet Touch & Transitions

**File**: `src/components/dashboard/OrderQuickView.tsx`
- Action buttons at bottom: enforce `min-h-[44px]` and add `active:scale-[0.98]` press effect
- Lab link button: add `min-h-[44px]` touch target
- Add smooth `animate-fade-in` to the content sections

### 5. LandingNav Mobile Menu Polish

**File**: `src/components/landing/LandingNav.tsx`
- Mobile menu trigger button: ensure `min-h-[44px] min-w-[44px]`
- Mobile menu items already have `min-h-[44px]` — good
- Add `active:bg-primary/10` press feedback to mobile nav items
- Sign Out / Sign In buttons: ensure `min-h-[44px]`
- Add smooth staggered entrance for mobile menu items using CSS animation delays

### 6. Global CSS Micro-Interaction Utilities

**File**: `src/index.css`
- Add a `.press-feedback` utility: `@apply active:scale-[0.97] transition-transform duration-100`
- Add `.stagger-fade-in` with nth-child animation delays for list items
- Add `.touch-target-enforced` utility: `@apply min-h-[44px] min-w-[44px]`

---

## Files Summary

| File | Change |
|------|--------|
| `src/index.css` | Add touch/micro-interaction utility classes |
| `src/components/ui/button.tsx` | Enforce 44px touch targets on `icon` and `sm` sizes |
| `src/pages/Dashboard.tsx` | Toolbar touch targets, role subtitle, press feedback |
| `src/components/OrderDashboard.tsx` | Card animations, filter touch targets, press effects |
| `src/components/dashboard/OrderQuickView.tsx` | Button touch targets, press feedback, fade-ins |
| `src/components/landing/LandingNav.tsx` | Mobile menu touch targets, press feedback, stagger animation |

