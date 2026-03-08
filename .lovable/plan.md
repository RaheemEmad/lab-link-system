

# Repository Cleanup & Redundancy Report

## 1. Files Safe to Delete

### A. Completely Unused Files (zero imports)

| File | Reason |
|---|---|
| `src/pages/Index.tsx` | Not routed or imported anywhere — leftover scaffold |
| `src/components/ui/animated-badge.tsx` | Zero imports across codebase |
| `src/components/ui/multi-step-form-demo.tsx` | Zero imports — demo artifact |
| `src/components/ui/password-strength-meter.tsx` | Zero imports — duplicate of `password-strength-indicator.tsx` which IS used |
| `src/components/ui/form-feedback.tsx` | Zero imports |
| `src/components/ui/context-menu.tsx` | Only self-imports (Radix wrapper), never consumed |
| `src/components/ui/menubar.tsx` | Only self-imports, never consumed |
| `src/components/ui/navigation-menu.tsx` | Only self-imports, never consumed |
| `src/components/ui/toggle.tsx` | Only self-imports, never consumed |
| `src/components/ui/toggle-group.tsx` | Only self-imports, never consumed |
| `src/components/ui/aspect-ratio.tsx` | Only self-imports, never consumed |
| `src/components/ui/drawer.tsx` | Zero imports outside itself |
| `src/lib/performanceMonitor.ts` | Zero imports |
| `src/lib/orderValidation.ts` | Zero imports |
| `src/lib/exportUtils.ts` | Zero imports |
| `src/hooks/useRetryMutation.tsx` | Zero imports |
| `public/sounds/achievement-unlock.mp3` | Contains a JS comment, not an actual audio file |
| `dev-dist/registerSW.js` | Build artifact — should not be in source |
| `dev-dist/sw.js` | Build artifact |
| `dev-dist/workbox-137dedbd.js` | Build artifact |

### B. Unused Edge Functions (not invoked from frontend)

| Function | Reason |
|---|---|
| `supabase/functions/create-order-with-rate-limit/` | Zero references in src — superseded by `create-order` |
| `supabase/functions/detect-ip/` | Zero references in src |
| `supabase/functions/create-test-user/` | Zero references in src — test utility |
| `supabase/functions/account-health-check/` | Zero references in src |
| `supabase/functions/check-reminders/` | Zero references in src |
| `supabase/functions/validate-file-upload/` | Zero references in src — validation done client-side |

### C. Demo/Dev Pages (routes exist but serve no production purpose)

| File | Route | Recommendation |
|---|---|---|
| `src/pages/StyleGuide.tsx` | `/style-guide` | Delete (dev-only) |
| `src/pages/AutosaveDemo.tsx` | `/autosave-demo` | Delete (dev-only) |

**Total: ~28 files safe to delete**

---

## 2. Redundancy Report

### A. `formatFileSize()` — 3 duplicate definitions

| Location | Type |
|---|---|
| `src/lib/imageCompression.ts` (line 128) | Canonical — used by 4 files |
| `src/components/chat/OrderChatWindow.tsx` (line 433) | Inline duplicate |
| `src/components/feedback-room/AttachmentCard.tsx` (line 155) | Inline duplicate |
| `src/components/order/ZipContentsPreview.tsx` (line 44) | Inline duplicate |

**Fix:** Move to `src/lib/formatters.ts`, delete the 3 inline copies.

### B. `supabase.auth.getUser()` — 10+ redundant calls

Files calling `getUser()` inside event handlers instead of using the `useAuth()` hook:
- `OrderNotesDialog.tsx` (4 calls)
- `ShipmentDetailsDialog.tsx`
- `CancelOrderDialog.tsx`
- `AdminOrdersTab.tsx`
- `LabReassignDialog.tsx`
- `AdminSecurityTab.tsx`
- `FileUploadSection.tsx`

**Fix:** Pass `user` from `useAuth()` context as prop or use the hook directly.

### C. Notification insert pattern — repeated in 5+ files

The same `supabase.from("notifications").insert({...})` pattern with `user_id`, `order_id`, `title`, `message`, `type` is duplicated across:
- `TrackOrders.tsx`
- `DeliveryConfirmationDialog.tsx`
- `BidRevisionDialog.tsx`
- `OrderStatusDialog.tsx`
- `LabWorkflowManagement.tsx`

**Fix:** Extract `createNotification(params)` utility to `src/lib/notifications.ts`.

### D. `password-strength-meter.tsx` vs `password-strength-indicator.tsx`

Nearly identical components (156 vs 163 lines) with the same internal logic. Only `indicator` is imported (by `Auth.tsx`). The `meter` version is dead code.

---

## 3. Unified Refactor Strategy

### Phase 1: Delete Dead Files (low risk)
- Delete all 28 files listed above
- Remove routes for `/style-guide` and `/autosave-demo` from `App.tsx`
- Add `dev-dist/` to `.gitignore`

### Phase 2: Extract Shared Utilities
1. Move `formatFileSize` to `src/lib/formatters.ts` (alongside existing `formatEGP` and `countTeeth`)
2. Create `src/lib/notifications.ts` with `createNotification()` helper
3. Replace all 3 inline `formatFileSize` copies with the shared import
4. Replace 5+ notification insert patterns with the shared helper

### Phase 3: Eliminate Redundant `getUser()` Calls
- In components that already have access to auth context, replace `supabase.auth.getUser()` with `useAuth()` hook or prop-drilled `user.id`
- This removes ~10 unnecessary network round-trips

### Phase 4: Clean Edge Functions
- Delete the 6 unused edge functions
- Keep `_shared/` directory (used by remaining functions)

### Summary of Impact

| Metric | Value |
|---|---|
| Files deleted | ~28 |
| Edge functions deleted | 6 |
| Duplicate functions unified | 4 (`formatFileSize` x3 + `password-strength-meter`) |
| Redundant API calls removed | ~10 `getUser()` calls |
| Notification patterns unified | 5 files → 1 utility |
| Build artifacts cleaned | 3 files (`dev-dist/`) |

