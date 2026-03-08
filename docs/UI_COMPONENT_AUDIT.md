# UI Component Audit Report

**Date:** 2026-03-08  
**Scope:** All React components in `src/`

---

## 1. Re-Render Issues

### 1.1 CRITICAL — Debug Logging on Every Render ✅ FIXED
| Component | Issue | Impact |
|-----------|-------|--------|
| `OrderDashboard.tsx` | `console.debug()` called on every render with object allocation | High CPU on frequent updates |

**Fix applied:** Removed render-time debug logging and verbose `fetchOrders` console statements.

### 1.2 HIGH — State Updates Triggering Cascading Re-renders
| Component | State Count | Issue |
|-----------|-------------|-------|
| `Profile.tsx` | 8 individual `useState` calls | Each field update triggers re-render of entire page |
| `OrderDashboard.tsx` | 12 `useState` calls | Dialog states, selection, pagination all independent |
| `Auth.tsx` | 9 `useState` calls | Form state should use `useForm` for all fields |
| `OrdersMarketplace.tsx` | 10 `useState` calls | Filter + UI state intermixed |

**Recommendation:** Group related state with `useReducer` or form libraries:
```typescript
// Before: 8 individual states
const [fullName, setFullName] = useState("");
const [phone, setPhone] = useState("");
// ...6 more

// After: single reducer
const [profileState, dispatch] = useReducer(profileReducer, initialState);
```

### 1.3 MEDIUM — Realtime Subscriptions Triggering Full Refetch
| Component | Issue |
|-----------|-------|
| `OrderDashboard.tsx` | Any `orders` table change → full `fetchOrders()` refetch |
| `LandingNav.tsx` | Fetches `user_roles` in `useEffect` instead of using `useUserRole()` hook |
| `AdminNotifications.tsx` | Uses `useState` + manual fetch instead of React Query |
| `LabWorkflowManagement.tsx` | Manual `useState` + `useEffect` for data |

---

## 2. Missing Memoization

### 2.1 Components That Should Use `React.memo`
These receive stable props but re-render when parent updates:

| Component | Why Memo | Parent Re-renders |
|-----------|----------|-------------------|
| `LabCard.tsx` | Renders in list, props rarely change | Labs page filters cause full re-render |
| `OrderStatusBadge` | Pure display component | Every dashboard update |
| `AchievementBadge.tsx` | Static display | Parent list re-renders |
| `ChecklistItem.tsx` | Individual items in list | Parent state changes |
| `AttachmentCard.tsx` | Static file display | Parent uploads |

### 2.2 Missing `useMemo` for Expensive Computations

| Component | Computation | Recommendation |
|-----------|-------------|----------------|
| `OrderDashboard.tsx` | Filtering/sorting orders in render | `useMemo` on filtered list |
| `LabWorkflowManagement.tsx` | `.filter()` on orders array in JSX (lines 357, 420) | Extract to `useMemo` |
| `OrdersMarketplace.tsx` | Client-side filtering + sorting | `useMemo` on filtered orders |
| `ChatHistory.tsx` | `conversationsMap` built on every query | Already in queryFn (OK) |

### 2.3 Missing `useCallback` for Event Handlers Passed as Props

| Component | Handler | Passed To |
|-----------|---------|-----------|
| `OrderDashboard.tsx` | `handleDelete`, `handleEdit`, `handleStatusChange` | Row components |
| `Labs.tsx` | Filter change handlers | Filter components |
| `FeedbackRoomLayout.tsx` | Tab change handlers | Tab children |

---

## 3. Improper `useEffect` Dependencies

### 3.1 Missing Dependencies (Stale Closures)
| File | Line | Issue |
|------|------|-------|
| `AdminNotifications.tsx` | 34 | `useEffect(fn, [])` calls `fetchNotifications` which uses no deps but should |
| `AdminCommunicationTab.tsx` | 28 | `useEffect(fn, [])` — `fetchNotes` has no deps |
| `AdminDashboardTab.tsx` | 87 | `useEffect(fn, [])` — `fetchStats` captures stale state |
| `QCChecklist.tsx` | 45 | `useEffect(fn, [])` — doesn't depend on `orderId` |
| `OrderTracking.tsx` | 75 | `useEffect(fn, [])` — `fetchOrders` should depend on user |

### 3.2 Over-Fetching Due to Effect Dependencies
| File | Issue |
|------|-------|
| `Labs.tsx` | 3 separate `useEffect` hooks for URL sync, realtime, and page reset — could be 1 |
| `LandingNav.tsx` | `useEffect` fetches `user_roles` on every `user` change (same as `useUserRole()`) |

### 3.3 Inline Async in useEffect (Anti-pattern)
Multiple components define async functions inside useEffect:
```typescript
// Anti-pattern found in 15+ components
useEffect(() => {
  const fetchData = async () => { ... };
  fetchData();
}, []);
```
**Should be:** React Query or extracted to a custom hook.

---

## 4. Large Components — Should Be Split

| Component | Lines | Responsibility Count | Suggested Splits |
|-----------|-------|---------------------|-----------------|
| `OrderDashboard.tsx` | **1,013** | 7+ (list, filters, bulk ops, dialogs, pagination, realtime, delete) | `OrderTable`, `OrderFilters`, `BulkActions`, `OrderDialogs` |
| `LabRequestsManagement.tsx` | **940** | 6+ (list, bids, accept/reject, profile preview, filters) | `RequestCard`, `BidActions`, `RequestFilters` |
| `LabWorkflowManagement.tsx` | **818** | 5+ (tabs, upload, status, notes, QC) | `WorkflowTabs`, `DesignUpload`, `OrderActions` |
| `OrdersMarketplace.tsx` | **717** | 5+ (list, filter, apply, bid, admin override) | `MarketplaceFilters`, `MarketplaceCard`, `ApplyAction` |
| `Profile.tsx` | **682** | 4+ (info, password, notifications, onboarding) | `ProfileForm`, `PasswordSection`, `NotificationSettings` |
| `BillingTab.tsx` | **631** | 5+ (list, sort, filter, actions, summary) | `InvoiceList`, `InvoiceActions`, `BillingOverview` |
| `FileUploadSection.tsx` | **596** | 4+ (upload, preview, queue, validation) | `FileDropzone`, `FilePreviewGrid`, `QueueStatus` |
| `InvoicePreview.tsx` | **858** | 3+ (header, line items, actions) | Already has sub-components but too deeply nested |

---

## 5. Repeated Layout Patterns

### 5.1 Page Layout Wrapper (Duplicated ~25 times)
```tsx
// This pattern is repeated in nearly every page:
<ProtectedRoute>
  <LandingNav />
  <main className="min-h-screen bg-background pt-20 pb-16">
    <div className="container mx-auto px-4 py-8">
      {/* page content */}
    </div>
  </main>
  <LandingFooter />
</ProtectedRoute>
```
**Recommendation:** Create `<PageLayout>` wrapper component.

### 5.2 Loading Skeleton Pattern (Duplicated ~15 times)
```tsx
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

### 5.3 Empty State Pattern (Duplicated ~10 times)
```tsx
if (!data?.length) {
  return (
    <Card className="text-center py-12">
      <SomeIcon className="mx-auto h-12 w-12 text-muted-foreground" />
      <p>No items found</p>
    </Card>
  );
}
```
**Recommendation:** Create `<EmptyState icon={} message={} />` component.

---

## 6. Prop Drilling Issues

### 6.1 User/Role Prop Drilling
| Chain | Depth | Fix |
|-------|-------|-----|
| `Dashboard` → `OrderDashboard` → `OrderRow` → `StatusDialog` | 4 levels | Use `useAuth()` / `useUserRole()` directly |
| `LabRequestsManagement` → `BidActions` → `BidDialog` | 3 levels | Props are appropriate here |
| `LandingNav` → fetches own `user_roles` | N/A | Should use `useUserRole()` hook |

### 6.2 Dialog State Prop Drilling
`OrderDashboard` passes 6+ dialog-related state pairs:
```typescript
// 6 dialog states, 6 setters = 12 props worth of state
const [statusDialogOpen, setStatusDialogOpen] = useState(false);
const [selectedOrder, setSelectedOrder] = useState(null);
const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
const [historyOrder, setHistoryOrder] = useState(null);
// ... etc
```
**Fix:** Consolidate into `useDialogManager()` hook.

---

## 7. Missing Lazy Loading ✅ MOSTLY GOOD

Pages are already lazy-loaded in `App.tsx` (39 lazy imports). Missing:

| Component | Used In | Why Lazy |
|-----------|---------|----------|
| `BillingAnalytics` | BillingTab | Heavy recharts dependency |
| `InvoiceAnalyticsDashboard` | BillingTab | Only shown on click |
| `MonthlyBillingSummary` | BillingTab | Dialog, loaded on demand |
| `OrderReceiptPDF` | OrderDetails | Print-only component |
| `LabProfilePreview` | Multiple | Dialog component, heavy |
| `CompareLabsDialog` | LabRequests | Comparison feature, rare use |

---

## 8. Improper Key Usage in Lists

### 8.1 Index Keys on Dynamic Lists 🔴
| File | Line | List Type | Risk |
|------|------|-----------|------|
| `OrderForm.tsx` | 881 | `uploadedFiles.map((file, index) => <div key={index}>` | Files can be removed/reordered |
| `DraftsManager.tsx` | 131 | `drafts.map((draft, index)` | Drafts can be deleted |

### 8.2 Index Keys on Static Lists ✅ OK
These are acceptable since content is static:
| File | Component |
|------|-----------|
| `FAQSection.tsx` | Static FAQ items |
| `HowItWorks.tsx` | Static step cards |
| `FeatureSnapshot.tsx` | Static feature list |
| `ProofSection.tsx` | Static testimonials |
| `ProblemSection.tsx` | Static problem cards |
| `ZeroCostStack.tsx` | Static workflow items |

---

## 9. Fixes Applied in This Audit

| Fix | File | Impact |
|-----|------|--------|
| ✅ Removed render-time debug logging | `OrderDashboard.tsx` | Prevents object allocation every render |
| ✅ Removed verbose fetchOrders logging | `OrderDashboard.tsx` | Cleaner console, less GC pressure |
| ✅ Silenced network detection toast | `FileUploadSection.tsx` | Removes unnecessary state update on mount |

---

## 10. Priority Action Items

### Immediate (High Impact, Low Effort)
1. ✅ Remove debug `console.debug` from render paths — **DONE**
2. Create `<PageLayout>` to eliminate repeated Nav/Footer wrapper
3. Add `useMemo` to `OrderDashboard` filtered/sorted list
4. Add `useMemo` to `LabWorkflowManagement` inline `.filter().map()` calls

### Short-Term (Medium Effort)
5. Split `OrderDashboard.tsx` (1,013 lines) into 4 focused components
6. Split `LabRequestsManagement.tsx` (940 lines) into sub-components
7. Consolidate dialog states with `useDialogManager` pattern
8. Replace manual `useState`+`useEffect` data fetching with React Query in:
   - `AdminNotifications.tsx`
   - `AdminCommunicationTab.tsx`
   - `AdminDashboardTab.tsx`
   - `LabWorkflowManagement.tsx`
   - `OrderTracking.tsx`

### Long-Term (High Effort)
9. `React.memo` on list item components (`LabCard`, `AchievementBadge`, etc.)
10. Create `<EmptyState>` and `<LoadingSkeleton>` shared components
11. Virtualize long lists (orders, labs) with `@tanstack/react-virtual`
12. Group Profile.tsx state into `useReducer` or `react-hook-form`

---

*Report generated by automated UI component audit*
