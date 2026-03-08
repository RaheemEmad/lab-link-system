

# Plan: Fix "Invalid or Expired Token" on Order Submission with Photo Upload

## Root Cause

The `onSubmit` flow in `OrderForm.tsx` has a critical ordering problem:

1. **File upload** (line 380) uses `supabase.storage.upload()` which relies on the client's internal session token
2. **Session check** (line 387) happens *after* the upload — too late
3. If the session has expired (auth logs confirm `"Session not found"`), the storage upload fails silently or with a cryptic error, and the edge function call returns "Invalid or expired token"

`supabase.auth.getSession()` returns a cached session — it does NOT refresh an expired token. We need `refreshSession()` to force a token refresh.

## Fix — `src/components/OrderForm.tsx`

At the **top of `onSubmit`** (before any storage or edge function calls):

1. Call `supabase.auth.refreshSession()` to force a fresh token
2. If refresh fails (truly expired / logged out), show a clear error telling the user to log in again and `return` early
3. Use the refreshed `session.access_token` for the edge function call (already does this, but now with a fresh token)
4. The storage client will also automatically pick up the refreshed session for file uploads

**Concrete change** — replace lines 372–390 with:

```typescript
setIsLoading(true);
setUploadProgress(0);

try {
  // Refresh session BEFORE any authenticated calls (upload + edge function)
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session) {
    toast.error("Session expired", {
      description: "Please log in again to submit your order.",
    });
    setIsLoading(false);
    return;
  }
  const session = refreshData.session;

  // Upload files first if any
  let photoUrls: string[] = [];
  if (uploadedFiles.length > 0) {
    toast.info("Uploading images...");
    photoUrls = await uploadFiles();
    setUploadedUrls(photoUrls);
  }

  toast.info("Creating order...");
```

Then remove the duplicate `getSession()` call at lines 387–390 and use `session` from the refresh above for the edge function `Authorization` header.

## Files Changed

| File | Change |
|------|--------|
| `src/components/OrderForm.tsx` | Move session refresh to top of `onSubmit`, before file upload. Replace `getSession()` with `refreshSession()`. Show clear re-login prompt on expired session. |

Single file, ~15 lines changed. No migration needed.

