

# Full System Audit — Flow, Function & Connection Verification

## Critical Bugs Found (P0)

### 1. OrderDashboard Lab Staff Query is WRONG
**File**: `src/components/OrderDashboard.tsx` line 202-204
**Issue**: Lab staff filter uses `.not("assigned_lab_id", "is", null)` — this shows ALL orders with any lab assigned, not just orders assigned to THIS lab. A lab_staff user can see orders belonging to other labs.
**Fix**: Query `order_assignments` for the user's assigned orders (same pattern as OrderTracking.tsx), or filter by `assigned_lab_id = labId` from `useUserRole()`.

### 2. Admin.tsx Still Uses `supabase.auth.getUser()` Instead of `useAuth()`
**File**: `src/pages/Admin.tsx` line 39
**Issue**: Bypasses the auth context, makes a redundant network call. Also doesn't use `useUserRole()` for admin check.
**Fix**: Use `useAuth()` for user + `useUserRole()` for admin role check.

### 3. OrderChatWindow.tsx Still Uses `supabase.auth.getUser()`
**File**: `src/components/chat/OrderChatWindow.tsx` line 61
**Issue**: Makes a redundant auth network call on every chat window mount instead of using the `useAuth()` hook's cached user.
**Fix**: Accept `userId` as a prop or use `useAuth()`.

### 4. LogisticsDashboard STILL Has Redundant Manual Role Query
**File**: `src/pages/LogisticsDashboard.tsx` line 106
**Issue**: Previous fix only added a comment but didn't actually replace the manual query. Still queries `user_roles` directly instead of using `labId` from `useUserRole()`.
**Fix**: Replace `const { data: roleData } = await supabase.from("user_roles")...` with `if (labId) shipmentQuery = shipmentQuery.eq("assigned_lab_id", labId);`

---

## High-Priority Issues (P1)

### 5. LabWorkflowManagement.tsx — No `useUserRole()`, Manual Role/Lab Fetching
**File**: `src/pages/LabWorkflowManagement.tsx` lines 99-130
**Issue**: Manually queries `user_roles` for access check AND for `lab_id` on every mount. Also uses wildcard realtime (`event: "*"`) triggering full refetch on every change. No React Query — uses raw `useState`/`useEffect`.
**Fix**: Use `useUserRole()` for role check and `labId`. Use granular realtime like OrderTracking was fixed.

### 6. LabOrderDetail.tsx — No Role Guard
**File**: `src/pages/LabOrderDetail.tsx`
**Issue**: Only wraps in `ProtectedRoute` (authentication only) — has no `RoleGuard` for `lab_staff` or admin. Any authenticated doctor could navigate to `/lab-order/:orderId` directly.
**Fix**: Add role check or verify via order assignment access.

### 7. DesignApprovalWorkflow.tsx — No ProtectedRoute or RoleGuard
**File**: `src/pages/DesignApprovalWorkflow.tsx`
**Issue**: Has no `ProtectedRoute` wrapper at all. An unauthenticated user could hit this route. Uses `useAuth()` but only checks `if (!user) return` — doesn't redirect.
**Fix**: Wrap in `ProtectedRoute`.

### 8. 14 Files Still Have `select("*")` (110 instances)
**Files**: LabSelector, OrderTemplateSelector, TemplatesLibrary, Profile, LabPerformanceStats, AvailabilityManager, UserEditDialog, AchievementToast, AchievementProgressNotification, LabAchievements, EditOrder (attachments), useLabInventory, DecisionsTab, AdminSecurityTab
**Impact**: Over-fetching data on tables with 20-40+ columns.

### 9. Onboarding Edge Functions Use `SUPABASE_ANON_KEY` Instead of Service Role
**Files**: `supabase/functions/onboarding-choose-role/index.ts`, `supabase/functions/onboarding-complete/index.ts`
**Issue**: `onboarding-choose-role` creates the Supabase client with `SUPABASE_ANON_KEY` and then calls `set_user_role` RPC. If this RPC requires elevated permissions (which it should for security), it will fail unless the function runs as service role. The `onboarding-complete` function correctly passes the user's JWT in headers for RLS, but `onboarding-choose-role` does NOT — it creates a bare anon client and then verifies the token manually. This means the `set_user_role` RPC runs without the user's auth context.
**Risk**: If `set_user_role` is a `SECURITY DEFINER` function this works. If not, RLS may block it.

### 10. EditOrder.tsx Still Queries `user_roles` Manually
**File**: `src/pages/EditOrder.tsx` line 187-190
**Issue**: Fetches role to determine if user is doctor or lab_staff, when `useUserRole()` hook is available.

---

## Medium Issues (P2)

### 11. Missing `ProtectedRoute` on Several Pages
- `/how-it-works` — Public, OK
- `/labs` — Public, OK
- `/labs/:labId` — Public, OK
- `/design-approval` — **MISSING ProtectedRoute** (P1, listed above)
- `/lab-workflow` — Uses manual auth check only, should use ProtectedRoute
- `/order-tracking` — Uses manual auth check only, should use ProtectedRoute
- `/lab-order/:orderId` — Has ProtectedRoute but no role check

### 12. OrderDashboard Uses `select("*")` on Orders Table
**File**: `src/components/OrderDashboard.tsx` line 188
**Issue**: `select("*, labs(...)` fetches all 40+ columns from orders table for every dashboard load. This is the most-hit query in the app.
**Fix**: Replace with explicit column list.

### 13. OrderDashboard Wildcard Realtime
**File**: `src/components/OrderDashboard.tsx` line 171
**Issue**: Subscribes to `event: "*"` on all orders, then calls `fetchOrders()` (full refetch). Same issue previously fixed in OrderTracking and LogisticsDashboard.

### 14. AdminLogin Double-Redirect
**File**: `src/pages/AdminLogin.tsx`
**Issue**: Uses `signIn()` from `useAuth()` which already navigates to `/dashboard` on success (line in useAuth.tsx). Then AdminLogin also calls `navigate("/admin")`. This creates a race condition — user may end up at `/dashboard` instead of `/admin`.
**Fix**: AdminLogin should NOT call `signIn()` from the hook (which auto-redirects). It should use raw supabase auth and then redirect to `/admin` explicitly.

### 15. Settings Page — Push/Email Toggles Not Persisted
**File**: `src/pages/Settings.tsx`
**Issue**: `emailNotifs` and `pushNotifs` state are `useState(true)` / `useState(false)` — never saved to the database. Toggling them does nothing persistent.

---

## Implementation Plan

| # | Priority | Task | Files |
|---|----------|------|-------|
| 1 | P0 | Fix OrderDashboard lab_staff query to use `labId` filter | `OrderDashboard.tsx` |
| 2 | P0 | Replace `supabase.auth.getUser()` in Admin.tsx with `useAuth()` + `useUserRole()` | `Admin.tsx` |
| 3 | P0 | Replace `supabase.auth.getUser()` in OrderChatWindow with prop/hook | `OrderChatWindow.tsx` |
| 4 | P0 | Fix LogisticsDashboard to actually use `labId` from hook | `LogisticsDashboard.tsx` |
| 5 | P1 | Refactor LabWorkflowManagement to use `useUserRole()` | `LabWorkflowManagement.tsx` |
| 6 | P1 | Add ProtectedRoute to DesignApprovalWorkflow | `DesignApprovalWorkflow.tsx` |
| 7 | P1 | Fix AdminLogin double-redirect race condition | `AdminLogin.tsx` |
| 8 | P1 | Replace `select("*")` in OrderDashboard + 14 remaining files | 15 files |
| 9 | P1 | Fix OrderDashboard wildcard realtime | `OrderDashboard.tsx` |
| 10 | P2 | Add ProtectedRoute wrappers to lab-workflow and order-tracking | 2 files |
| 11 | P2 | Replace manual `user_roles` query in EditOrder.tsx | `EditOrder.tsx` |

