
# Backend Performance & Redundancy Audit

## 1. Performance Bottlenecks Identified

### A. Client-Side Filtering on Large Result Sets (`ChatHistory.tsx`)
**Issue:** The `ChatHistory.tsx` component fetches `chat_messages` using `.range()` pagination, but it fetches **all** messages and filters them in memory based on the user's role (`doctor_id` or `assigned_lab_id`).
**Impact:** 
- Pagination is broken (fetching 50 items might yield 0 relevant items after filtering).
- Wastes bandwidth and exposes metadata from orders the user shouldn't see.
**Fix:** Apply server-side filtering using Supabase's inner join capabilities:
```typescript
.select('..., orders!inner(...)')
.or(`doctor_id.eq.${user.id},assigned_lab_id.eq.${labId}`, { foreignTable: 'orders' })
```

### B. Inefficient Data Transformations (`AdminAnalyticsTab.tsx`)
**Issue:** The `processAnalyticsData` function runs 4 separate `.reduce()` loops over the same `orders` array to calculate `ordersByDate`, `statusDist`, and `trendsByDate`.
**Impact:** CPU blocking operations growing at `O(4n)`.
**Fix:** Consolidate these into a single-pass `forEach` or `reduce` loop, similar to what was done for `useInvoiceAnalytics`.

---

## 2. Redundancy & Duplication Report

### A. Duplicated Formatting Utilities
**Issue:** The `formatFileSize` function is duplicated across 3 different locations:
1. `src/lib/formatters.ts` (The designated single source of truth)
2. `src/lib/imageCompression.ts` (Lines 123-136)
3. `src/components/order/OrderAttachmentsHub.tsx` (Lines 95-99)

**Fix:** Remove the duplicate definitions in `imageCompression.ts` and `OrderAttachmentsHub.tsx`. Import it directly from `@/lib/formatters`.

---

## 3. Unnecessary Artifacts & Safe to Delete

Based on the repository scan:
- **Abandoned Hooks/Functions:** The previous audit already deleted `useOptimizedQuery`, `cache.ts`, and `stateSync.ts`.
- **No-Op Functions:** `useUnreadCount.tsx` is currently just a thin wrapper returning `useNotificationData()`. It can be safely refactored away and its consumers updated to use `useNotificationData()` directly, deleting the file.

---

## 4. Unified Refactor Strategy

1. **Database Queries:** Update `ChatHistory.tsx` to enforce RLS-style filtering via `!inner` relations before data leaves Supabase.
2. **Code Cleanliness:** Strip the redundant `formatFileSize` blocks. Use ESLint/TSElint to throw on `formatFileSize` definitions outside of `lib/formatters.ts`.
3. **Data Processing:** Optimize `processAnalyticsData` in the Admin Dashboard to perform a single iteration over the dataset.
