

# Backend Performance Audit Report

## 1. Critical Performance Bottlenecks

### 1.1 N+1 / Waterfall Queries in `useInboxItems.tsx`
The Inbox hook fires **4 parallel queries** (chats, approvals, deliveries, invoices), but the chat query itself is a **3-step waterfall**:
1. Fetch all doctor orders → get IDs
2. Fetch chat_messages for those IDs
3. Client-side dedup by order

**Fix**: Replace with a single query using a join: `chat_messages.select("*, orders!inner(order_number, patient_name)")` filtered by `read_at.is.null` and ordered, with `.limit()`. Eliminates 2 round trips.

### 1.2 `select("*")` Over-fetching — 28 Files
Found **215 instances** of `select("*")` across 28 files. Key offenders:
- `OrderChatWindow.fetchMessages()` — fetches all columns from chat_messages when only 8 are used
- `EditOrder.tsx` — `select("*")` on orders table (40+ columns) when editing needs ~15
- `AdminActivityTab` — `select("*")` on audit_logs (no pagination, limit 100 but still wide)
- `Achievements.tsx`, `LabProfile.tsx`, `Labs.tsx` — all fetching full rows

**Fix**: Replace `select("*")` with explicit column lists in all 28 files. Priority on `orders` table which has 40+ columns.

### 1.3 Logistics Dashboard — Full Table Refetch on Any Change
`LogisticsDashboard.tsx` line 123: subscribes to `event: "*"` on the entire `orders` table, then calls `fetchData()` (full re-query) on **every** change to **any** order. Same pattern in `TrackingTabContent.tsx`.

**Fix**: Use granular realtime subscriptions with filters (e.g., `assigned_lab_id=eq.{labId}`) and update cache in-place for UPDATE events, only refetch on INSERT.

### 1.4 Duplicate Notification Queries
Three independent queries to the `notifications` table for the same user happen on every page load:
- `useUnreadCount` — `select("type").eq("read", false)` + 60s polling
- `useLogisticsTabBadges` — identical `select("type").eq("read", false)` + realtime channel
- `NotificationHistory` — `select("*")` with joins

**Fix**: Create a single `useNotifications` hook that fetches once and exposes derived data (unread count, tab badges, full list). Share via React Query cache key.

### 1.5 `create-order` Edge Function — 4 Sequential DB Calls for Rate Limiting
The rate limit check in `create-order/index.ts` makes **4 sequential DB calls** before the actual order insert:
1. SELECT rate_limits (minute window)
2. SELECT rate_limits (hour window)
3. INSERT/UPDATE minute record
4. INSERT/UPDATE hour record

**Fix**: Replace with a single Postgres function: `SELECT check_and_increment_rate_limit(identifier, endpoint)` that does all 4 operations in one round trip.

### 1.6 `auto-assign-lab` — No Caching of Lab Data
Every auto-assign call fetches ALL active labs + specializations. For high-order-volume periods, this is redundant.

**Fix**: Cache lab scoring data in-memory for 5 minutes (labs don't change frequently). Or use a materialized view for lab scoring.

---

## 2. Missing Pagination

| Location | Issue | Fix |
|----------|-------|-----|
| `NotificationHistory.tsx` | Fetches ALL notifications, no limit | Add `.range()` pagination |
| `useInboxItems` — approvals/deliveries | No limit on orders query | Add `.limit(50)` |
| `OrderChatWindow.fetchMessages()` | Loads ALL messages for an order | Add cursor-based pagination, load last 50 |
| `AdminActivityTab` | `limit(100)` but no "load more" | Add infinite scroll |
| `AdminUsersTab` | `select("*")` on ALL profiles | Add pagination |
| `Labs.tsx` — specializations | Fetches ALL specializations for all labs | Fetch per-lab on demand |

---

## 3. Missing Batching

| Location | Issue | Fix |
|----------|-------|-----|
| `EditOrder.tsx` lines 295-371 | Sequential: update order → log history → insert notifications → insert attachments → log activity | Batch notifications + attachments into single inserts (already partially done). Wrap in edge function for atomicity |
| `LabRequestsManagement.tsx` | Accept request → update order → create assignment → notify → refuse others — all sequential client-side | Move to edge function for atomic transaction |
| `useRealtimeNotifications` line 208-214 | Invalidates 6 query keys sequentially on each notification | Batch with `queryClient.invalidateQueries({ predicate })` using a single predicate function |

---

## 4. Duplicated / Overlapping Endpoints

| Overlap | Details |
|---------|---------|
| Unread notifications | `useUnreadCount` + `useLogisticsTabBadges` make identical queries |
| Order fetching | `useOrdersQuery` (infinite), `LogisticsDashboard` (useEffect), `TrackingTabContent` (useEffect), `useInboxItems` (4 queries) — all fetch from `orders` with different filters but no shared cache |
| User role fetching | `useUserRole` is properly centralized, but `LogisticsDashboard` line 105 manually queries `user_roles` instead of using the hook |

---

## 5. Inefficient Data Transformations

| Location | Issue | Fix |
|----------|-------|-----|
| `ChatHistory.tsx` | Fetches messages with `.range()` but then **groups by order client-side** in a Map — should be a DB aggregate | Use `GROUP BY order_id` via an RPC function or view |
| `useLogisticsTabBadges` | Fetches all unread notifications then counts by type in JS | Add `.eq("type", type)` per tab or use a single COUNT GROUP BY query |
| `useInboxItems` chat dedup | Fetches all unread messages then deduplicates by order_id client-side | Use `DISTINCT ON (order_id)` via RPC |

---

## 6. Missing Caching Layers

| Data | Current | Recommended |
|------|---------|-------------|
| Lab list (active labs) | Fetched fresh every page visit | `staleTime: 5 * 60_000` — labs rarely change |
| Lab specializations | Fetched per-page with no staleTime | Share query key, staleTime 5 min |
| User profile/role | `useUserRole` has no explicit staleTime | Add `staleTime: 5 * 60_000` |
| Order templates | No staleTime set | Add `staleTime: 60_000` |
| Notification count | 60s polling + realtime | Remove polling, rely solely on realtime channel |

---

## 7. Optimized Query Suggestions

### High Impact
1. **Consolidate notification queries**: Single `useNotificationData` hook → derived `unreadCount`, `tabBadges`, `notificationList`
2. **Rate limit as DB function**: Single `check_rate_limit()` call instead of 4 queries
3. **Chat history DB view**: `CREATE VIEW chat_conversations AS SELECT DISTINCT ON (order_id) ...` — eliminates client-side grouping
4. **Inbox single-query approach**: Replace 4 inbox queries with one RPC that returns categorized items

### Medium Impact
5. Replace all `select("*")` with explicit columns (28 files)
6. Add `.limit()` to all unbounded queries
7. Remove `useUnreadCount` polling (redundant with realtime)
8. Use `useUserRole` hook in LogisticsDashboard instead of manual query

### Architecture Improvements
9. Move `LabRequestsManagement` accept/reject flow to an edge function for atomicity
10. Create shared `useLabsCache` hook with 5-min staleTime for lab directory data
11. Add `DISTINCT ON` or `ROW_NUMBER()` indexes for chat dedup queries

---

## 8. Implementation Priority

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Consolidate 3 notification queries into 1 shared hook | -66% notification DB calls |
| P0 | Replace rate-limit waterfall with DB function | -75% calls per order creation |
| P1 | Add pagination to ChatHistory, Notifications, AdminUsers | Prevents unbounded growth |
| P1 | Replace `select("*")` in top-10 most-hit queries | -40% data transfer |
| P1 | Fix LogisticsDashboard realtime (filter + cache update) | Eliminates full refetch storms |
| P2 | Create chat_conversations DB view | Eliminates client-side grouping |
| P2 | Add staleTime to lab/role/template queries | Reduces redundant fetches |
| P2 | Batch query invalidation in realtime handler | Smoother UI updates |

