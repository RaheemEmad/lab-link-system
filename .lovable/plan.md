

# Fix: Stale Cache Error — `LanguageToggle is not defined`

## Root Cause
The current source code of `DesktopRightActions.tsx` is correct — it does NOT reference `LanguageToggle`. The error is from a **stale Vite HMR cache** serving the old version of the file before the consolidation edit.

## Fix
Apply a trivial no-op edit to `DesktopRightActions.tsx` to force Vite to invalidate the module cache and serve the current (correct) version. This is a single-line comment addition or whitespace change — no logic changes needed.

## Files to Change
- `src/components/landing/nav/DesktopRightActions.tsx` — add a comment to force cache bust

