

# Plan: Fix "Bucket not found" When Viewing Photos in Feedback Room

## Root Cause

Two separate issues:

1. **Order photos** uploaded during order creation go to the `design-files` bucket, which is **private** (`public = false`). The code uses `getPublicUrl()` to generate URLs stored in `photos_link`, but these URLs return 404/"Bucket not found" because the bucket isn't public.

2. **Feedback room uploads** use `${orderId}/...` as the storage path, but the `order-attachments` bucket RLS policy expects `${userId}/...` as the first folder segment. This causes upload failures too.

## Fix

### Migration: Make `design-files` bucket public

```sql
UPDATE storage.buckets SET public = true WHERE id = 'design-files';
```

This matches what was already done for `order-attachments` and allows the public URLs stored in `photos_link` to resolve correctly.

### Code Fix: `AttachmentUploader.tsx` — Fix upload path

Change the storage path from `${orderId}/...` to `${user.id}/${orderId}/...` so it satisfies the RLS upload policy on `order-attachments` bucket (which requires the first folder to be the user's ID).

## Files Changed

| File | Change |
|------|--------|
| DB Migration | `UPDATE storage.buckets SET public = true WHERE id = 'design-files'` |
| `src/components/feedback-room/AttachmentUploader.tsx` | Fix upload path to `${user.id}/${orderId}/...` |

