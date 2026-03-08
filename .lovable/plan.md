

# Platform Audit: Missing Features & Fallback Strategies

After navigating through the codebase (~60+ pages, hooks, components), here are the gaps and priorities organized by impact.

---

## Critical Missing: Offline/Network Resilience

**Problem:** Zero offline handling. No `navigator.onLine` checks, no network error boundaries, no retry-on-reconnect UX. If a user loses connectivity mid-action (e.g., submitting an order, saving profile), the app silently fails or shows a generic error.

**Fix:**
- Create `src/hooks/useNetworkStatus.tsx` — listens to `online`/`offline` events, exposes `isOnline` state
- Create `src/components/ui/offline-banner.tsx` — a sticky top banner ("You're offline. Changes will sync when reconnected.")
- Add it to `AppContent` in `App.tsx`
- Wrap critical mutations (order create, profile save, status updates) with offline-aware error handling that queues actions or shows clear messaging

---

## Critical Missing: Global Empty States

**Problem:** Most list pages (Dashboard orders, Marketplace, Notifications, Chat History, Drafts, Patient Cases) have no proper empty state component. When a new user signs up and goes to Dashboard, they see a blank void with no guidance.

**Fix:**
- Create a reusable `src/components/ui/empty-state.tsx` component (icon, title, description, optional CTA button)
- Apply to: OrderDashboard (no orders), Marketplace (no open orders), NotificationHistory (no notifications), ChatHistory (no chats), DraftsManager (no drafts), PatientCases (no cases)

---

## High Priority: No Dark Mode Toggle

**Problem:** `next-themes` is installed and `sonner` uses `useTheme`, but there's no user-facing dark mode toggle anywhere. The `.dark` CSS class structure exists in `chart.tsx` but users can't switch themes.

**Fix:**
- Add a `ThemeProvider` from `next-themes` wrapping the app
- Add a theme toggle button (sun/moon icon) to the Profile page and optionally the LandingNav user dropdown
- Ensure all custom colors use CSS variables that respond to `.dark`

---

## High Priority: No Dedicated Settings Page

**Problem:** Profile page (`/profile`) handles profile info, password, and notifications all in one long scrollable page. There's no centralized settings page for app preferences (theme, language, notification preferences, session management, data export).

**Fix:**
- Create `/settings` page with tabbed sections: Account, Notifications, Appearance (theme), Privacy (data export/deletion), Sessions
- Move notification toggles from Profile to Settings
- Keep Profile focused on personal info and achievements

---

## Medium Priority: 404 Page is Bare

**Problem:** `NotFound.tsx` is a minimal unstyled page — no branding, no navigation, no helpful links. Users hitting a bad URL get a dead end.

**Fix:**
- Add `LandingNav` and `LandingFooter`
- Add search suggestions, popular links (Dashboard, New Order, Support)
- Add a "Go to Dashboard" button for authenticated users

---

## Medium Priority: Error Boundary Has No Recovery Context

**Problem:** `ErrorBoundary` shows error details but doesn't offer to navigate to safe pages based on user role. No telemetry or error reporting.

**Fix:**
- Add role-aware navigation buttons ("Go to Dashboard" for authenticated users)
- Add a "Report this issue" link
- Consider logging errors to a backend table for admin visibility

---

## Medium Priority: No Confirmation/Success Animations for Key Actions

**Problem:** Critical user actions (order submitted, payment recorded, profile saved) have toast-only feedback. No visual success states that feel rewarding.

**Fix:**
- Add success states with checkmark animations for: Order submission, Profile save, Delivery confirmation
- The confetti library (`canvas-confetti`) is already installed but underused

---

## Low Priority: No App-Wide Search

**Problem:** No global search to find orders by number, patient name, or lab. Users must navigate to specific pages and use per-page filters.

**Fix:**
- Add a command palette (cmdk is already installed) triggered by Ctrl+K or a search icon in the nav
- Search across orders, labs, notifications, and pages

---

## Summary Table

| Priority | Feature | Impact |
|----------|---------|--------|
| Critical | Offline/network resilience banner | Prevents data loss, improves trust |
| Critical | Global empty states | First-time UX, reduces confusion |
| High | Dark mode toggle | User preference, accessibility |
| High | Settings page | Organizational clarity |
| Medium | 404 page redesign | Reduces dead-end frustration |
| Medium | Error boundary improvements | Better recovery from crashes |
| Medium | Success state animations | Emotional UX, feels polished |
| Low | Global command palette search | Power-user efficiency |

## Recommended Build Order
1. Offline banner + network hook (small, high impact)
2. Empty state component + apply to key pages
3. Dark mode toggle
4. 404 page upgrade
5. Settings page
6. Command palette search

