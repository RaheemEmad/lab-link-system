

# Batch 2 Plan: Enhanced Lab Reviews + Appointment Availability + Analytics Export

## Summary

Three focused changes:
1. **Enhanced Lab Reviews** — Add 2 new rating columns (`value_rating`, `accuracy_rating`) to `lab_reviews`, update the review dialog and display.
2. **Appointment Scheduling: Lab Availability Slots** — New `lab_availability_slots` table so labs define open windows; doctors book from available slots.
3. **Analytics CSV Export** — Add export buttons to the existing `/analytics` page for both doctor and lab views.

---

## 1. Enhanced Lab Reviews (5-Category Ratings)

### Database Migration
```sql
ALTER TABLE public.lab_reviews
  ADD COLUMN value_rating integer,
  ADD COLUMN accuracy_rating integer;
```
No new RLS needed — existing policies cover all columns.

### Frontend Changes

**`src/components/order/PostDeliveryReviewDialog.tsx`**
- Add state for `valueRating` and `accuracyRating` (default 5)
- Add two new `<RatingRow>` components: "Value for Money" and "Accuracy"
- Include both in the `.insert()` call

**`src/pages/LabProfile.tsx`**
- Update the reviews query to select `value_rating, accuracy_rating`
- Display all 5 category breakdowns (small star rows) on each review card
- Add an average breakdown section at the top of the reviews list

---

## 2. Appointment Scheduling: Lab Availability Slots

### Database Migration
```sql
CREATE TABLE public.lab_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_bookings integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (lab_id, day_of_week, start_time)
);

ALTER TABLE public.lab_availability_slots ENABLE ROW LEVEL SECURITY;

-- Lab staff manage their own slots
CREATE POLICY "Lab staff manage own availability" ON public.lab_availability_slots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.lab_id = lab_availability_slots.lab_id
      AND user_roles.role = 'lab_staff'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.lab_id = lab_availability_slots.lab_id
      AND user_roles.role = 'lab_staff'
  ));

-- Doctors can view active slots (for booking)
CREATE POLICY "Doctors view active availability" ON public.lab_availability_slots
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins full access
CREATE POLICY "Admins manage all availability" ON public.lab_availability_slots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

### Frontend Changes

**New: `src/components/lab/AvailabilityManager.tsx`**
- Grid UI: rows = days of week, columns = time slots
- Toggle cells on/off to set availability
- Save via upsert to `lab_availability_slots`
- Accessible from lab dashboard/profile

**Update: `src/pages/AppointmentScheduling.tsx`**
- When doctor selects an order (which has an `assigned_lab_id`), fetch that lab's availability slots
- Filter the date picker to only allow days matching available `day_of_week`
- Filter time slots to only show the lab's configured windows
- Show "No availability" message if lab hasn't configured slots

**Update: `src/pages/LabProfile.tsx` or Lab Dashboard**
- Add navigation link to "Manage Availability" for lab staff

---

## 3. Analytics CSV Export

### Approach
Reuse existing `exportToCSV` from `src/lib/exportUtils.ts`. Add export buttons to each analytics view.

### Frontend Changes

**`src/pages/Analytics.tsx`**
- Import `exportToCSV` dynamically
- **Doctor view**: Add "Export Report" button that exports:
  - KPIs row (total orders, spent, turnaround, completion rate)
  - Favorite labs list
  - Restoration type breakdown
- **Lab view**: Add "Export Report" button that exports:
  - KPIs row
  - Monthly revenue data
  - Top clients list
- Both use `exportToCSV()` with a timestamped filename

---

## Files Summary

| Action | File |
|--------|------|
| Migration | New SQL: add `value_rating`/`accuracy_rating` to `lab_reviews` |
| Migration | New SQL: create `lab_availability_slots` table with RLS |
| Modify | `src/components/order/PostDeliveryReviewDialog.tsx` — 2 new rating rows |
| Modify | `src/pages/LabProfile.tsx` — show 5-category breakdown |
| Create | `src/components/lab/AvailabilityManager.tsx` — slot management grid |
| Modify | `src/pages/AppointmentScheduling.tsx` — filter by lab availability |
| Modify | `src/pages/Analytics.tsx` — add CSV export buttons |

