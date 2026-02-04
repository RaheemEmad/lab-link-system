
# Implementation Plan: Order Attachments, Storage RLS Fix, React Error Fix & ZIP Support

## Summary of Issues

1. **Storage Upload RLS Error**: Doctors cannot upload photos during order creation because the `design-files` bucket only allows lab_staff/admin to INSERT
2. **React Error #31**: An object `{role, lab_id}` is being rendered as React children somewhere in the codebase
3. **Order Attachments Section**: Already exists as `OrderAttachmentsHub` in LabOrderDetail, but needs verification it shows all doctor notes
4. **ZIP File Support**: Need to add ZIP file validation with QC checks and lazy loading

---

## Part 1: Fix Storage RLS Policy for Doctors

### Problem
The `design-files` bucket INSERT policy only allows `lab_staff` and `admin`:
```sql
WITH CHECK (
  bucket_id = 'design-files' AND
  (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);
```

But doctors upload photos during order creation to this bucket.

### Solution
Add a new storage policy allowing doctors to upload to `design-files`:

```sql
-- Allow doctors to upload files for their own orders
CREATE POLICY "Doctors can upload design files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  has_role(auth.uid(), 'doctor'::app_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Part 2: Fix React Error #31 (Object Rendered as Children)

### Problem
React error #31 occurs when an object is passed where text is expected. The error message mentions `{role, lab_id}`.

### Root Cause Analysis
In `LabOrderDetail.tsx` line 147-161, the `checkLabAccess` function queries:
```typescript
const { data: roleData } = await supabase
  .from('user_roles')
  .select('role, lab_id')
  .eq('user_id', user.id)
  .single();
```

The issue is that somewhere `roleData` (the whole object) is being rendered instead of `roleData.role`.

### Files to Check and Fix

| File | Potential Issue |
|------|-----------------|
| `src/pages/LabOrderDetail.tsx` | Toast or error display may render object |
| `src/hooks/useUserRole.tsx` | Hook returns object that might be rendered |

### Solution
Audit all usages of `roleData` or user role queries to ensure only string properties are rendered in JSX.

---

## Part 3: Order Attachments Hub Verification

### Current State
The `OrderAttachmentsHub` component is already integrated in `LabOrderDetail.tsx` at line 867-876:

```tsx
<OrderAttachmentsHub 
  orderId={order.id}
  order={{
    biological_notes: order.biological_notes,
    handling_instructions: order.handling_instructions,
    approval_notes: order.approval_notes,
    photos_link: order.photos_link
  }}
/>
```

### What It Displays
The hub already consolidates:
- **Doctor Notes**: Biological notes, handling instructions, approval notes
- **Team/Lab Notes**: From `order_notes` table
- **External Photos**: Via `photos_link`
- **Uploaded Files**: From `order_attachments` table

### Minor Enhancements
- Consider adding "notes_to_lab" field if it exists separately from biological_notes
- Ensure the hub is prominently placed in the page layout

---

## Part 4: ZIP File Support with QC Checks

### Changes to `src/lib/fileValidation.ts`

Add ZIP file signature detection and validation:

```typescript
// Add to FILE_SIGNATURES array
{
  mimeType: 'application/zip',
  signature: [[0x50, 0x4B, 0x03, 0x04]], // PK header
},
{
  mimeType: 'application/zip',
  signature: [[0x50, 0x4B, 0x05, 0x06]], // Empty archive
},
```

### New ZIP Validation Function

```typescript
export async function validateZipFile(file: File): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contents?: { name: string; size: number; type: string }[];
}> {
  // Check ZIP signature
  // Check for path traversal in filenames
  // Check for executable files inside
  // Return list of contents for preview
}
```

### Changes to `src/components/order/FileUploadSection.tsx`

1. Add ZIP to accepted file types:
```typescript
const ACCEPTED_ARCHIVE_TYPES = ["application/zip", "application/x-zip-compressed"];
```

2. Add lazy-loaded ZIP preview component:
```typescript
const ZipContentsPreview = lazy(() => import('./ZipContentsPreview'));
```

3. Add ZIP validation on file select:
```typescript
if (isZip) {
  const zipValidation = await validateZipFile(file);
  if (!zipValidation.isValid) {
    toast.error(`Invalid ZIP file: ${file.name}`);
    continue;
  }
}
```

### New Component: `src/components/order/ZipContentsPreview.tsx`

Lazy-loaded component to display ZIP contents:
- List of files with sizes
- File type icons
- Expandable tree view for nested folders
- Warnings for suspicious files

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/order/ZipContentsPreview.tsx` | Lazy-loaded ZIP preview component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/fileValidation.ts` | Add ZIP signature detection and validation |
| `src/components/order/FileUploadSection.tsx` | Add ZIP file support with lazy loading |
| Migration SQL | Add storage policy for doctors to upload |

---

## Database Migration

```sql
-- Allow doctors to upload to design-files bucket
CREATE POLICY "Doctors can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  has_role(auth.uid(), 'doctor'::app_role) AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## ZIP Validation Rules (QC Checks)

| Check | Severity | Description |
|-------|----------|-------------|
| Path traversal | Error | Files with `../` in name |
| Executable files | Error | `.exe`, `.dll`, `.bat`, etc. inside |
| File size mismatch | Warning | Compressed size > original (zip bomb) |
| Nested archives | Warning | ZIP within ZIP |
| Too many files | Warning | More than 100 files |
| Large archive | Info | Total uncompressed > 100MB |

---

## Technical Details

### ZIP Signature Bytes
- `0x50 0x4B 0x03 0x04` - Local file header
- `0x50 0x4B 0x05 0x06` - End of central directory (empty archive)
- `0x50 0x4B 0x07 0x08` - Spanning marker

### Lazy Loading Implementation
```tsx
const ZipContentsPreview = lazy(() => 
  import('./ZipContentsPreview').then(module => ({
    default: module.ZipContentsPreview
  }))
);

// Usage with Suspense
<Suspense fallback={<Skeleton className="h-32" />}>
  <ZipContentsPreview file={file} />
</Suspense>
```
