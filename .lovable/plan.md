

# Review: Alerts Badge & Navbar UX Improvements

## Part 1: Alerts / Notification Badge Audit

### Current State
- **User-facing notifications** (`useNotificationData` → `useUnreadCount`): Queries the `notifications` table filtering by `user_id` and `read=false`. The count shown on the Inbox bell icon in the navbar is correct — it reflects all unread notifications for the current user.
- **Realtime**: `useRealtimeNotifications` subscribes to `postgres_changes` on `notifications` table filtered by `user_id` and invalidates `["unread-notifications", ...]` query key on INSERT. This means the badge updates in real-time when new notifications arrive. Correct.
- **Admin alerts** (`AdminNotifications` + `AdminAlertsTab`): These query `admin_notifications` table (separate from user `notifications`). They have their own realtime subscription on `admin_notifications` INSERT. The unread count is managed via local state (`useState`), not React Query — but since it's admin-only and the realtime subscription updates state directly, this works fine.

### Issues Found
1. **AdminNotifications realtime cleanup leak**: `setupRealtimeSubscription()` returns a cleanup function but `useEffect` doesn't use the return value. The channel is never removed on unmount.
2. **AdminAlertsTab same issue**: Same cleanup leak pattern.
3. **No `enabled` guard on admin queries**: Both admin components fetch on mount without checking if user is authenticated/admin. Minor since they're rendered inside admin routes, but not defensive.

### Fixes
- Fix the `useEffect` in both `AdminNotifications.tsx` and `AdminAlertsTab.tsx` to properly return the cleanup function from `setupRealtimeSubscription()`.

## Part 2: Navbar UI — Merge Theme, Language, Settings into Account Dropdown

### Current State (Desktop)
The right side of the navbar has these items in a row:
`[LanguageToggle] [ThemeToggle] [CreateOrder?] [Logistics?] [RoleMenu?] [Achievements?] [Inbox] [Admin?] [AccountDropdown]`

That's up to 8 icon buttons — too crowded.

### Plan
Move `LanguageToggle`, `ThemeToggle`, and `Settings` link **inside** the Account dropdown menu. This removes 2 standalone icon buttons from the navbar and groups preferences logically.

**New Account dropdown structure:**
```
Profile
Settings
─────────
🌐 Language: English / العربية  (toggle row)
🌙 Theme: Light / Dark / System  (sub-items)
─────────
Sign Out
```

### Files to Change

1. **`src/components/landing/nav/DesktopRightActions.tsx`**
   - Remove standalone `<LanguageToggle />` and `<ThemeToggle />` from the top-level flex
   - Add language toggle row and theme options inside the Account `<DropdownMenuContent>`
   - Import `useLanguage` and `useTheme` directly instead of using the toggle components

2. **`src/components/admin/AdminNotifications.tsx`**
   - Fix `useEffect` to return cleanup: `useEffect(() => { fetchNotifications(); return setupRealtimeSubscription(); }, []);`

3. **`src/components/admin/AdminAlertsTab.tsx`**
   - Same cleanup fix for `useEffect`

