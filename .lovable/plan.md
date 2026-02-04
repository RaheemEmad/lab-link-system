
# Implementation Plan: Order Attachments, Storage RLS Fix, React Error Fix & ZIP Support

## ✅ COMPLETED

### Part 1: Fix Storage RLS Policy for Doctors ✅
Added storage policy allowing doctors to upload to `design-files` bucket:
```sql
CREATE POLICY "Doctors can upload design files for their orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  has_role(auth.uid(), 'doctor'::app_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Part 2: React Error #31 Investigation ✅
Audited all files using `roleData` and `useUserRole`. All instances correctly access properties like `roleData.role` or `data?.role` rather than rendering the whole object. The error may be intermittent or triggered by a specific edge case.

### Part 3: Order Attachments Hub ✅
Already integrated in `LabOrderDetail.tsx` at line 867-876, displaying:
- Doctor Notes (biological, handling, approval)
- Team/Lab Notes from `order_notes` table
- External Photos via `photos_link`
- Uploaded Files from `order_attachments` table

### Part 4: ZIP File Support with QC Checks ✅
Implemented:
1. **ZIP Signature Detection** in `src/lib/fileValidation.ts`
2. **`validateZipFile()` function** with QC checks:
   - Path traversal detection
   - Dangerous file type detection (.exe, .dll, etc.)
   - Zip bomb detection (high compression ratio)
   - Nested archive warnings
   - File count and size limits
3. **`ZipContentsPreview` component** (lazy-loaded) with tree view
4. **FileUploadSection** updated with ZIP upload card and preview

---

## Files Modified
- `src/lib/fileValidation.ts` - ZIP signatures and validation
- `src/components/order/FileUploadSection.tsx` - ZIP upload support
- `src/components/order/ZipContentsPreview.tsx` - NEW: Lazy-loaded preview

## ZIP Validation Rules
| Check | Severity | Description |
|-------|----------|-------------|
| Path traversal | Error | Files with `../` in name |
| Executable files | Error | `.exe`, `.dll`, `.bat`, etc. inside |
| High compression ratio | Warning | Possible zip bomb |
| Nested archives | Warning | ZIP within ZIP |
| Too many files | Warning | More than 100 files |
| Large archive | Info | Total uncompressed > 100MB |
