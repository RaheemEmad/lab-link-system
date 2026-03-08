

# Plan: Patient Case Photo Attachments with Storage Integration

## Overview
Add direct photo upload to patient cases using a `patient-case-photos` storage bucket. Photos will be uploadable from the case cards and during case creation (delivery confirmation). Each case stores multiple photo URLs in a new `photos` jsonb column (array of URLs).

## Database Changes

**Migration:**
- Add `photos` column (jsonb, default `'[]'`) to `patient_cases` — stores array of public URLs
- Create `patient-case-photos` storage bucket (public, 10MB limit, image types only)
- RLS on storage: doctors can upload/delete to their own folder (`{user_id}/*`)

```sql
ALTER TABLE public.patient_cases ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('patient-case-photos', 'patient-case-photos', true, 10485760, 
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS: doctors upload to their own folder
CREATE POLICY "Doctors upload own case photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-case-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doctors delete own case photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'patient-case-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view case photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'patient-case-photos');
```

## Frontend Changes

### 1. `src/hooks/usePatientCases.tsx`
- Add `photos: string[]` to `PatientCase` interface
- Add `uploadCasePhoto(caseId, file)` mutation: compresses image, uploads to `patient-case-photos/{userId}/{caseId}/{filename}`, appends URL to `photos` jsonb array
- Add `removeCasePhoto(caseId, photoUrl)` mutation

### 2. `src/components/patient-cases/CasePhotoUploader.tsx` (new)
- Compact file input with drag-drop zone
- Shows thumbnails of existing photos with remove button
- Uses `compressImage()` from `src/lib/imageCompression.ts`
- Max 6 photos per case

### 3. `src/pages/PatientCases.tsx`
- Add photo thumbnails row on each case card (first 3 photos as small previews)
- Add "Manage Photos" button that opens a dialog with full uploader
- Photo lightbox on click

### 4. `src/components/order/DeliveryConfirmationDialog.tsx`
- When "Save to Case Library" is checked, also pass existing order photos to the new case

## Files
| Action | File |
|--------|------|
| Migration | New SQL migration |
| Create | `src/components/patient-cases/CasePhotoUploader.tsx` |
| Modify | `src/hooks/usePatientCases.tsx` — add photos field, upload/remove mutations |
| Modify | `src/pages/PatientCases.tsx` — photo thumbnails on cards, manage dialog |
| Modify | `src/components/order/DeliveryConfirmationDialog.tsx` — pass photos on case save |

