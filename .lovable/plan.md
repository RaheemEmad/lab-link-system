

# Backend Performance Audit & Comprehensive Refactor Plan

## 1. Performance Bottlenecks Found

### A. Redundant `getUser()` Network Calls (10 files, ~15 calls)
Components call `supabase.auth.getUser()` inside event handlers instead of using `useAuth()` hook, causing unnecessary round-trips to the auth server on every user action.

**Files:** `OrderNotesDialog.tsx` (4 calls), `ShipmentDetailsDialog.tsx`, `CancelOrderDialog.tsx`, `AdminOrdersTab.tsx`, `LabReassignDialog.tsx`, `AdminSecurityTab.tsx`, `FileUploadSection.tsx`, `OrderChatWindow.tsx`, `LabProfile.tsx`, `OrdersMarketplace.tsx`

### B. Duplicated Notification Insert Pattern (5 files)
Same `supabase.from("notifications").insert({...})` pattern repeated across `TrackOrders.tsx`, `DeliveryConfirmationDialog.tsx`, `BidRevisionDialog.tsx`, `OrderStatusDialog.tsx`, `LabWorkflowManagement.tsx`.

### C. OrderDashboard Bypasses `useOrdersQuery` (978 lines)
`OrderDashboard.tsx` uses raw `useState` + `useEffect` + manual `fetchOrders()` instead of the existing `useOrdersQuery` hook which already has pagination, optimistic updates, and realtime subscriptions. This creates:
- Duplicate realtime subscriptions
- No pagination (fetches ALL orders)
- No caching (refetches on every realtime event)
- No optimistic updates

### D. ChatHistory Fetches ALL Messages Client-Side
`ChatHistory.tsx` line 76: queries ALL `chat_messages` with no pagination or limit, then groups client-side. Also duplicates role fetching with a raw `useEffect` instead of `useUserRole()`.

### E. Duplicate Analytics Calculations
`InvoiceAnalyticsDashboard.tsx` and `MonthlyBillingSummary.tsx` both run near-identical `.reduce()` and `.filter()` loops over invoice arrays (revenue, paid, due, status counts, restoration type grouping).

### F. Multiple Components Use `useState`+`useEffect` Instead of React Query
~15 components use manual fetch patterns with `useState([])` + `useEffect` + `setLoading`, missing out on caching, deduplication, and stale-while-revalidate. Key offenders:
- `OrderDashboard.tsx`, `TrackOrders.tsx`, `OrderTracking.tsx`, `LogisticsDashboard.tsx`
- `AdminUsersTab.tsx`, `AdminSecurityTab.tsx`, `AdminAlertsTab.tsx`
- `OrderHistoryTimeline.tsx`, `QCChecklist.tsx`

### G. Realtime Subscriptions Trigger Full Refetches
`OrderDashboard.tsx` and `TrackOrders.tsx` both call `fetchOrders()` on ANY realtime event, refetching ALL data instead of doing granular cache updates like `useOrdersQuery` does.

---

## 2. Refactor Strategy

### Phase 1: Extract `createNotification` Utility
- Create `src/lib/notifications.ts` with a shared helper
- Replace 5+ inline notification insert patterns
- Single source of truth for notification creation

### Phase 2: Replace `getUser()` with `useAuth()` Hook
- In each of the 10 files, add `useAuth()` (or accept `user` as prop) and remove `supabase.auth.getUser()` calls
- Eliminates ~15 redundant network round-trips per user session

### Phase 3: Extract `useInvoiceAnalytics` Hook
- Create shared hook from the duplicated analytics logic in `InvoiceAnalyticsDashboard.tsx` and `MonthlyBillingSummary.tsx`
- Single-pass reduce instead of multiple `.reduce()` + `.filter()` calls

### Phase 4: Split Large Components
| Component | Lines | Split Into |
|---|---|---|
| `OrderDashboard.tsx` | 978 | Refactor to use `useOrdersQuery` hook (removes ~100 lines of manual fetch/realtime logic) |
| `LabRequestsManagement.tsx` | 934 | Extract filter bar, request cards, action handlers |
| `BillingTab.tsx` | 625 | Already modular — no split needed |
| `FileUploadSection.tsx` | 593 | Extract preview list, queue visualization, validation logic |

### Phase 5: Migrate Key Pages to React Query
Priority migrations (manual fetch → React Query):
1. `TrackOrders.tsx` — uses `useState` + manual fetch + manual realtime
2. `OrderTracking.tsx` — same pattern
3. `LogisticsDashboard.tsx` — same pattern
4. `ChatHistory.tsx` — fetches ALL messages, needs server-side pagination + `useUserRole()` instead of manual role fetch

---

## 3. Implementation Order

1. **Create `src/lib/notifications.ts`** — extract shared `createNotification()`, update 5 files
2. **Replace `getUser()` calls** — update 10 files to use `useAuth()` hook
3. **Create `useInvoiceAnalytics` hook** — deduplicate analytics in 2 billing components
4. **Refactor `OrderDashboard.tsx`** to use existing `useOrdersQuery` hook (biggest single win — removes duplicate fetch logic, adds pagination + caching)
5. **Add pagination to `ChatHistory.tsx`** queries and replace manual role fetch with `useUserRole()`

This plan focuses on the highest-impact, lowest-risk changes first. Each phase is independently shippable and maintains existing functionality.

