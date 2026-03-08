

# Fix: Page Refresh Signs Out User

## Root Cause

In `useAuth.tsx` (lines 126-136), when `rememberMe` is `false` (which is the **default** for new users), a `beforeunload` event listener calls `supabase.auth.signOut()`. The problem: **`beforeunload` fires on page refresh, not just browser close**. There is no reliable way to distinguish a refresh from a close in browsers.

So every time a user who didn't check "Remember me" refreshes, the `beforeunload` handler fires, signs them out, and the page loads with no session.

## Fix

**Remove the `beforeunload` sign-out hack entirely.** It's fundamentally broken — it cannot distinguish refresh from close.

### Changes in `src/hooks/useAuth.tsx`

In the `signIn` method (lines 125-140), remove:
- The `sessionStorage` temporary flag logic
- The `beforeunload` event listener that calls `signOut()`
- Keep only the `setSession` call and success toast/navigate

In the `signOut` method (line ~160), remove:
- `sessionStorage.removeItem('lablink_session_temporary')`

The "Remember me" checkbox can remain in the UI for future server-side session duration control, but it must not trigger client-side sign-out on page events.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Remove `beforeunload` listener and `sessionStorage` temporary session logic from `signIn` and `signOut` |

