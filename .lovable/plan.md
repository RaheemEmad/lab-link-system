

# Fix: Lab Admin "Access Denied" Flash During Role Loading

## Problem
Line 293 in `LabAdmin.tsx` combines loading and access denial into one check:
```typescript
if (roleLoading || (!isLabStaff && !isAdmin)) {
```
While `roleLoading` is `true`, the component renders the "Access Denied" card. After refresh, the role is cached so it resolves instantly — hence the issue only happens on first navigation.

## Fix
Split the condition into two separate checks:
1. If `roleLoading` → show a loading spinner
2. If role is confirmed and user is neither lab_staff nor admin → show "Access Denied"

### Change in `src/pages/LabAdmin.tsx` (lines 292-313)

Replace the single combined check with:

```typescript
// Show loading while role is being fetched
if (roleLoading) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Verifying permissions...</p>
          </div>
        </div>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
}

// Check access after role is confirmed
if (!isLabStaff && !isAdmin) {
  return (
    <ProtectedRoute>
      {/* existing Access Denied card */}
    </ProtectedRoute>
  );
}
```

## File Changed

| File | Change |
|------|--------|
| `src/pages/LabAdmin.tsx` | Split `roleLoading` from access check into separate loading spinner vs. denied states |

