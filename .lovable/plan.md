

# Fix Runtime Errors + Real-Time Cohesive Badge Counts

## Problem Analysis

### Runtime Errors
The `Bell is not defined` and `InboxIcon is not defined` errors are likely caused by a stale build cache — the imports in `LandingNav.tsx`, `MobileBottomNav.tsx`, and `Inbox.tsx` are all correct. To force a clean resolution, I will re-save the affected files with minor defensive adjustments (explicit re-exports or slight import restructuring).

### Badge Count Issues
Currently, badge counts across the app are **not cohesive**:
- `LandingNav.tsx` polls `notifications` table every 60s via `useQuery` (line 57-79)
- `MobileBottomNav.tsx` has its own separate `useQuery` polling `notifications` every 60s (line 24-39)
- `Inbox.tsx` has no badge count at all — it fetches full items
- Real-time subscription exists in `useRealtimeNotifications` (invalidates `['notifications']` and `['unread-notifications']` query keys), but nav queries use different keys (`"unread-notifications"` in LandingNav, `"mobile-nav-unread"` in MobileBottomNav) — so real-time invalidation only updates LandingNav, not MobileBottomNav

## Plan

### 1. Create a shared `useUnreadCount` hook
Single source of truth for unread notification count, used by both navs.
- Query key: `["unread-notifications", userId]` (matches what `useRealtimeNotifications` already invalidates)
- `staleTime: 30_000`, `refetchInterval: 60_000`
- Returns `{ unreadCount, hasUrgent }`

**File**: `src/hooks/useUnreadCount.tsx` (new)

### 2. Fix real-time invalidation alignment
In `useRealtimeNotifications.tsx`, it already invalidates `['unread-notifications']`. Ensure the shared hook uses that exact key so both navs update instantly on new notifications.

### 3. Update LandingNav.tsx
- Replace inline notification query with `useUnreadCount()`
- Ensure `Bell` and `InboxIcon` imports are clean (re-save to fix build cache)

### 4. Update MobileBottomNav.tsx
- Replace inline notification query with `useUnreadCount()`
- Fix query key alignment so real-time events trigger badge updates

### 5. Add real-time invalidation for inbox items
In `useRealtimeNotifications.tsx`, also invalidate `['inbox-chats']`, `['inbox-approvals']`, `['inbox-deliveries']`, `['inbox-invoices']` query keys so the Inbox page updates in real-time too.

## Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useUnreadCount.tsx` | Shared unread badge count hook |

## Files to Modify
| File | Change |
|------|---------|
| `src/components/landing/LandingNav.tsx` | Use `useUnreadCount()`, clean imports |
| `src/components/layout/MobileBottomNav.tsx` | Use `useUnreadCount()`, remove duplicate query |
| `src/hooks/useRealtimeNotifications.tsx` | Add inbox query key invalidations |

