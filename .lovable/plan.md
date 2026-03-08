

# Feature Build Plan: 6 New Features for Doctors & Labs

This is a large scope covering 6 features. Given the complexity, I recommend building them in 3 batches across multiple implementation rounds. Here is the full plan for **Batch 1** (the 3 highest-impact features that require the least new schema), with Batch 2 outlined for follow-up.

---

## Batch 1 (This Implementation)

### Feature 1: Patient Case Library + Reorder

**New table: `patient_cases`**
```sql
CREATE TABLE public.patient_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  restoration_type restoration_type NOT NULL,
  teeth_number text NOT NULL,
  teeth_shade text NOT NULL,
  shade_system text,
  biological_notes text,
  preferred_lab_id uuid REFERENCES labs(id),
  photos_link text,
  last_order_id uuid REFERENCES orders(id),
  order_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;
-- Doctors can only see/manage their own cases
CREATE POLICY "Doctors manage own cases" ON public.patient_cases
  FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());
```

**Frontend changes:**
- New page `src/pages/PatientCases.tsx` — searchable list of past patients with case details
- New hook `src/hooks/usePatientCases.tsx` — React Query CRUD
- "Save as Case" button on order completion (in `DeliveryConfirmationDialog` or dashboard)
- "Reorder" button on each case card that navigates to `/new-order` with query params pre-filling the form
- Modify `OrderForm.tsx` to read URL search params and pre-fill fields
- Add route `/patient-cases` to `App.tsx`
- Add nav link in Dashboard for doctors

### Feature 2: Lab Calendar View

**No new tables needed** — derives from existing `orders` table (deadline = `desired_delivery_date` or `expected_delivery_date`, status, assigned_lab_id).

**Frontend changes:**
- New page `src/pages/LabCalendar.tsx` — weekly/monthly grid view
- New component `src/components/lab/CalendarGrid.tsx` — renders orders as colored blocks by status/urgency
- Uses React Query to fetch orders assigned to the lab, grouped by delivery date
- Color coding: red = overdue/urgent, orange = due today, green = on track, gray = delivered
- Click order block to open `OrderDetailsModal`
- Add route `/lab-calendar` to `App.tsx`
- Add nav link in Dashboard for lab_staff

### Feature 3: Lab Inventory Tracker

**New table: `lab_inventory`**
```sql
CREATE TABLE public.lab_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  current_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  minimum_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric,
  supplier_name text,
  last_restocked_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.lab_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab staff manage own inventory" ON public.lab_inventory
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_inventory.lab_id 
    AND user_roles.role = 'lab_staff'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.lab_id = lab_inventory.lab_id 
    AND user_roles.role = 'lab_staff'
  ));
-- Admins can view all
CREATE POLICY "Admins view all inventory" ON public.lab_inventory
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

**Frontend changes:**
- Replace the placeholder in `LabAdmin.tsx` inventory tab with actual CRUD UI
- New component `src/components/lab/InventoryManager.tsx` — table with add/edit/delete, low-stock alerts (highlighted rows where `current_stock < minimum_stock`)
- New hook `src/hooks/useLabInventory.tsx` — React Query CRUD
- Categories: Zirconia, Porcelain, Acrylic, Metal Alloy, Impression Materials, Other

---

## Batch 2 (Follow-up Implementation)

### Feature 4: Analytics Dashboard
- New page `/analytics` with role-based views
- Doctors: spending trends (from invoices), favorite labs, avg turnaround
- Labs: revenue trends, top clients, capacity utilization, on-time rate
- Uses existing tables: orders, invoices, lab_performance_metrics

### Feature 5: Lab Rating & Reviews Enhancement
- `lab_reviews` table already exists with basic UI in LabProfile
- Add post-delivery review prompt (dialog after confirming delivery)
- Add quality/turnaround/communication sub-ratings (new columns)
- Display aggregate on lab cards in marketplace

### Feature 6: Appointment Scheduling
- New `appointments` table for pickup/delivery windows
- Calendar-based time slot picker
- Integration with logistics dashboard

---

## Technical Details

**Migration:** 2 new tables (`patient_cases`, `lab_inventory`) with RLS policies.

**New files:**
- `src/pages/PatientCases.tsx`
- `src/pages/LabCalendar.tsx`
- `src/hooks/usePatientCases.tsx`
- `src/hooks/useLabInventory.tsx`
- `src/components/lab/CalendarGrid.tsx`
- `src/components/lab/InventoryManager.tsx`

**Modified files:**
- `src/App.tsx` — 3 new routes
- `src/pages/Dashboard.tsx` — nav links for new pages
- `src/pages/LabAdmin.tsx` — replace inventory placeholder
- `src/components/OrderForm.tsx` — read URL params for reorder pre-fill
- `src/components/order/DeliveryConfirmationDialog.tsx` — "Save as Case" option

**Patterns followed:**
- React Query with `enabled: !!user?.id`, `staleTime: 30_000`
- `useAuth()` hook for user context (no `getUser()` calls)
- RLS-safe queries
- Mobile-responsive with Tailwind breakpoints

