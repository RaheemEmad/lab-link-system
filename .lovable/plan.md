

# Fix: Patient Cases Page Showing "Doctor Access Only" Prematurely

## Root Cause
In `PatientCases.tsx`, the guard logic checks `roleLoading` then `!isDoctor`. However, `useUserRole` exposes a `roleConfirmed` flag that indicates when the role is **definitively known**. The current code doesn't use it — so there's a brief window where `isLoading` is false but `roleConfirmed` is also false, causing the "Doctor Access Only" screen to flash (or stick) even for actual doctors.

## Fix

**File: `src/pages/PatientCases.tsx`**

Change the loading guard from:
```tsx
const { isDoctor, isLoading: roleLoading } = useUserRole();
// ...
if (roleLoading) { return <spinner> }
if (!isDoctor) { return <access denied> }
```

To:
```tsx
const { isDoctor, isLoading: roleLoading, roleConfirmed } = useUserRole();
// ...
if (roleLoading || !roleConfirmed) { return <spinner> }
if (!isDoctor) { return <access denied> }
```

This ensures the "access denied" screen only renders **after** the role query has definitively succeeded, preventing false negatives from race conditions between auth session restoration and the role query.

## Files Changed
| File | Change |
|------|--------|
| `src/pages/PatientCases.tsx` | Add `roleConfirmed` to guard, show spinner until role is confirmed |

