

# Fix PWA Installation, Install Feedback & Full Notification System

## Root Cause

### 1. Service Worker is dead code
`public/sw.ts` contains all the push notification + click handlers, but **it's never used**. VitePWA with `registerType: "autoUpdate"` uses the `generateSW` strategy, which creates its own Workbox service worker and ignores `public/sw.ts`. All push/notification handling code is unreachable.

### 2. No `navigateFallbackDenylist`
Missing `/~oauth` exclusion means OAuth redirects can be cached by the service worker, breaking auth flows.

### 3. No install success feedback
When a user installs the PWA, there's no toast or confirmation — the `appinstalled` event is never listened to.

### 4. Icons use combined `"any maskable"` purpose
Chrome requires separate icon entries for `any` and `maskable` purposes. A single entry with both can cause install failures on some devices.

---

## Fix Plan

### Step 1: Switch to `injectManifest` strategy + create proper SW source
- Change VitePWA from `generateSW` to `injectManifest` in `vite.config.ts`
- Create `src/sw.ts` as the actual service worker source that:
  - Imports and uses Workbox precaching (`precacheAndRoute` with the injected `self.__WB_MANIFEST`)
  - Includes push event handler (from current dead `public/sw.ts`)
  - Includes notification click/close handlers
  - Includes skip-waiting message handler
  - Adds `navigateFallbackDenylist: [/^\/~oauth/]` via `registerRoute` with NetworkOnly for OAuth
- Delete `public/sw.ts` (dead code)

### Step 2: Fix manifest icons
Split the single icon entry into separate `any` and `maskable` entries so Chrome properly detects installability.

### Step 3: Add install success feedback
- Create `src/hooks/usePWAInstall.tsx` — a global hook that:
  - Captures `beforeinstallprompt` event (single source of truth)
  - Listens for `appinstalled` event → shows success toast with confetti
  - Exposes `{ isInstallable, isInstalled, promptInstall }` 
- Update `Install.tsx` to use this hook instead of its own local state
- Update `LandingNav.tsx` to use this hook for the install button
- Add an install banner/prompt component that shows on mobile after 30s if not installed

### Step 4: Ensure notification system works end-to-end in PWA
- The existing `useRealtimeNotifications` already uses `registration.showNotification()` which works with the SW — just needs the SW to actually be registered (fixed by Step 1)
- Verify `usePushNotifications` VAPID flow integrates with the new SW

## Files to Change
- `vite.config.ts` — switch to `injectManifest`, fix icons, add denylist
- `src/sw.ts` — **new** real service worker with Workbox + push handlers
- `public/sw.ts` — **delete**
- `src/hooks/usePWAInstall.tsx` — **new** global PWA install hook
- `src/pages/Install.tsx` — use new hook
- `src/components/landing/LandingNav.tsx` — use new hook
- `src/App.tsx` — mount install banner + use hook

