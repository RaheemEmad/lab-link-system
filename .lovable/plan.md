

# Backend Performance Audit — Remaining Issues & Full Cleanup Plan

## Current State Summary
The previous round fixed P0 notification consolidation, rate-limit DB function, and some `select("*")` replacements. However significant issues remain across queries, dead code, component size, and lazy loading gaps.

---

## 1. Remaining `select("*")` Over-fetching (23 files, ~200 instances)

Replace with explicit columns in these high-traffic files:

| File | Table | Columns Actually Used |
|------|-------|-----------------------|
| `Achievements.tsx` | `user_badges` | `id, badge_type, earned_at, badge_value` |
| `LabProfile.tsx` | `labs`, `lab_specializations`, `lab_photos`, `lab_pricing` | Explicit per-query |
| `LabAdmin.tsx` | `labs`, `lab_specializations` | Same as LabProfile |
| `Labs.tsx` | `lab_specializations` | `id, lab_id, restoration_type, expertise_level, turnaround_days` |
| `AdminUsersTab.tsx` | `profiles` | `id, full_name, email, avatar_url, onboarding_completed, created_at` |
| `AdminActivityTab.tsx` | `audit_logs` | `id, action_type, table_name, user_id, created_at, record_id` |
| `AdminAlertsTab.tsx` | `admin_notifications` | `id, title, message, category, severity, created_at, is_read` |
| `AdminNotifications.tsx` | `admin_notifications` | Same as above |
| `LabBadges.tsx` | `lab_badges` | `id, badge_type, badge_value, earned_at, expires_at` |
| `LabPerformanceStats.tsx` | `lab_performance_metrics` | All columns needed (small table, acceptable) |
| `LabPortfolio.tsx` | `lab_portfolio_items` | `id, title, description, restoration_type, image_urls, before_image_url, after_image_url, is_featured, display_order` |
| `OrderReceiptPDF.tsx` | `chat_messages`, `invoices` | Explicit per-query |
| `SchedulingTabContent.tsx` | `lab_availability_slots` | `id, day_of_week, start_time, end_time, is_active` |
| `AppointmentScheduling.tsx` | `lab_availability_slots` | Same |
| `useLabTrustRanking.tsx` | `lab_pricing` | `id, lab_id, restoration_type, price_egp, includes_rush, rush_surcharge_percent` |
| `EditOrder.tsx` | `order_attachments` | `id, file_name, file_path, file_type` |

## 2. OrderTracking.tsx — Full Refactor

This 729-line page has critical issues:
- **Manual role fetch** via `supabase.from('user_roles')` instead of `useUserRole()` hook
- **Wildcard realtime** subscription (`event: "*"`) triggers full `fetchOrders()` on every change
- **No pagination** — fetches all orders
- **Uses `useState` + `useEffect`** instead of React Query
- **156 console.log statements** across 10 files

**Fix**: Refactor to use `useUserRole()`, React Query, granular realtime with in-place update, and add `.limit(50)`.

## 3. Console.log Cleanup

156 statements across 10 files. Replace with:
- Remove all `console.log` calls (keep `console.error` and `console.warn`)
- Files: `OrderChatWindow`, `slaMonitor`, `useDraftCleanup`, `autoScalingPolicies`, `NotificationHistory`, `OrderTracking`, `useBrowserNotifications`, `LabRequestsManagement`

## 4. Remaining `supabase.auth.getUser()` Calls

3 files still bypass `useAuth()`:
- `OrderChatWindow.tsx` — use `useAuth()` user.id
- `LabProfile.tsx` — use `useAuth()` 
- `Admin.tsx` — use `useAuth()` + `useUserRole()`

## 5. Missing Pagination

| File | Current | Fix |
|------|---------|-----|
| `OrderTracking.tsx` | All orders, no limit | `.limit(50)` + load more |
| `AdminUsersTab.tsx` | All profiles | `.range(0, 49)` + pagination |
| `LabRequestsManagement.tsx` | All requests | `.limit(50)` |

## 6. LogisticsDashboard — Redundant Role Query

Line 105 manually queries `user_roles` for `lab_id` when `useUserRole()` already provides `labId`. Remove the manual query and use the hook value.

## 7. Inbox Waterfall — Chat Query Optimization

`useInboxItems` chat path for doctors: 2 sequential queries (fetch orders → fetch messages). Could be a single query:
```
supabase.from("chat_messages")
  .select("id, order_id, message_text, created_at, sender_role, orders!inner(order_number, patient_name, doctor_id)")
  .eq("orders.doctor_id", userId)
  .neq("sender_id", userId)
  .is("read_at", null)
  .order("created_at", { ascending: false })
  .limit(100)
```
Same for lab_staff path: replace 3 queries with 1 using join through `order_assignments`.

## 8. Component Splits

| Component | Lines | Split Into |
|-----------|-------|------------|
| `LabRequestsManagement.tsx` | 946 | RequestsList, RequestActions, RequestFilters |
| `OrderTracking.tsx` | 729 | TrackingList, TrackingCard, TrackingFilters |
| `BillingTab.tsx` | 631 | InvoiceList, PaymentActions, BillingSummary |

## 9. Dead/Obsolete Code Detection

Files to investigate for removal or consolidation:
- `src/lib/autoScalingPolicies.ts` — Only used by AdminAlertsTab, could be server-side
- `src/lib/slaMonitor.ts` — Same pattern, client-side monitoring that should be server-side
- `src/components/ui/status-badge-showcase.tsx` — Dev showcase, not user-facing
- `src/components/dashboard/WorkloadHeatmap.tsx` — Check if actually rendered
- `src/components/challenges/ChallengeCard.tsx` — No route imports it
- `src/pages/AppointmentScheduling.tsx` — Check if duplicated by SchedulingTabContent
- `docs/` folder has 12 markdown files that are dev-only artifacts

## 10. Implementation Priority

| # | Task | Files | Impact |
|---|------|-------|--------|
| 1 | Replace `select("*")` in 16 high-traffic files | 16 files | -40% data transfer |
| 2 | Refactor `OrderTracking.tsx` (React Query + useUserRole + granular realtime) | 1 file | Eliminates full refetch storms, removes manual role query |
| 3 | Optimize `useInboxItems` chat waterfall to single join query | 1 file | -66% DB calls for inbox |
| 4 | Remove 156 `console.log` statements | 10 files | Cleaner prod output |
| 5 | Replace 3 `getUser()` calls with `useAuth()` | 3 files | -3 network calls |
| 6 | Remove LogisticsDashboard manual role query | 1 file | Use cached hook |
| 7 | Add pagination to OrderTracking, AdminUsers, LabRequests | 3 files | Bounded queries |
| 8 | Audit dead code files (ChallengeCard, status-badge-showcase, etc.) | ~5 files | Bundle reduction |
| 9 | Split 3 god components (LabRequests 946L, OrderTracking 729L, BillingTab 631L) | 3→9 files | Maintainability |

