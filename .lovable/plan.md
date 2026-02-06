
# Pricing Configuration, Visibility & Governance Implementation Plan

## Executive Summary
This plan addresses the fundamental pricing governance gap in LabLink by making pricing an explicit, mandatory configuration for every lab. Labs will be required to choose a pricing mode during onboarding, and pricing will be visible consistently across all surfaces.

---

## Current State Analysis

### What Exists
1. **`pricing_rules` table** - Global/template pricing rules owned by platform admins (13 active rules with base prices for all restoration types + urgency fees)
2. **`lab_pricing` table** - Lab-specific custom pricing (currently empty, no onboarding integration)
3. **`LabPricingSetup` component** - Allows labs to configure custom pricing in Lab Admin
4. **`LabProfile` page** - Shows pricing if `lab_pricing` has data, otherwise shows nothing
5. **`LabProfilePreview` component** - Does NOT display pricing at all
6. **`LabCard` component** - Shows pricing tier badge but no actual prices

### What's Missing
1. **No `pricing_mode` field** on labs table to track TEMPLATE vs CUSTOM choice
2. **No mandatory pricing configuration** during lab onboarding
3. **No visibility of template pricing** for labs or doctors
4. **No pricing display** in LabProfilePreview dialog
5. **No price versioning** with effective dates for historical accuracy
6. **No blocking mechanism** if pricing is not configured

---

## Database Changes

### 1. Add `pricing_mode` to Labs Table
```sql
ALTER TABLE labs 
ADD COLUMN pricing_mode TEXT CHECK (pricing_mode IN ('TEMPLATE', 'CUSTOM')) DEFAULT NULL;

ALTER TABLE labs 
ADD COLUMN pricing_configured_at TIMESTAMPTZ DEFAULT NULL;
```

### 2. Add Versioning to Lab Pricing
```sql
ALTER TABLE lab_pricing
ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE lab_pricing  
ADD COLUMN effective_from TIMESTAMPTZ DEFAULT now();

ALTER TABLE lab_pricing
ADD COLUMN effective_until TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE lab_pricing
ADD COLUMN is_current BOOLEAN DEFAULT true;
```

### 3. Add Pricing Audit Table for Change Tracking
```sql
CREATE TABLE lab_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  pricing_mode TEXT,
  pricing_data JSONB NOT NULL,
  version INTEGER NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  change_reason TEXT
);
```

---

## Component Changes

### 1. New Component: `PricingModeSelector`
A modal/card component for lab onboarding that:
- Displays both pricing options side-by-side
- Shows template pricing read-only preview
- Shows custom pricing entry form if selected
- Requires explicit choice before proceeding
- Stores selection in `labs.pricing_mode`

Location: `src/components/labs/PricingModeSelector.tsx`

UI Layout:
```text
+----------------------------------------------------------+
| Choose Your Pricing Strategy                              |
+----------------------------------------------------------+
|                                                          |
| [Platform Template Pricing]    [Custom Lab Pricing]       |
|                                                          |
| Use our standard prices       Set your own prices         |
| across all restoration        for each restoration        |
| types. Simple, no setup.      type. Full control.         |
|                                                          |
| Zirconia: EGP 150             [Enter your prices]         |
| E-max: EGP 180                                            |
| PFM: EGP 120                                              |
| ...                                                       |
|                                                          |
| Rush Surcharge: +25%          Rush Surcharge: [__]%       |
|                                                          |
|      [Select Template]        [Configure Custom]          |
+----------------------------------------------------------+
```

### 2. New Component: `TemplatePricingViewer`
A read-only component that displays global pricing rules:
- Fetches from `pricing_rules` table
- Shows base prices per restoration type
- Shows urgency surcharge
- Used in Lab Admin, Lab Profile, and onboarding

Location: `src/components/billing/TemplatePricingViewer.tsx`

### 3. Update: `LabProfilePreview.tsx`
Add pricing section that shows:
- Pricing mode indicator (Template or Custom)
- Actual prices from appropriate source
- Rush surcharge info

### 4. Update: `LabCard.tsx`
Add pricing preview:
- Show 1-2 sample prices (e.g., "From EGP 120")
- Label indicating pricing mode

### 5. Update: `LabProfile.tsx`
Enhance existing pricing section:
- If `pricing_mode = 'TEMPLATE'`: Show template prices with "Using Platform Pricing" label
- If `pricing_mode = 'CUSTOM'`: Show lab-specific prices with "Custom Pricing" label
- If `pricing_mode = NULL`: Show warning "Pricing not configured"

### 6. Update: `LabAdmin.tsx`
Add pricing mode management:
- Show current pricing mode with option to switch
- If TEMPLATE: Show read-only template pricing viewer
- If CUSTOM: Show editable LabPricingSetup
- Add change confirmation dialog explaining impact

### 7. Update: `Onboarding.tsx`
Add pricing configuration step for labs:
- After profile info, show PricingModeSelector
- Block completion until pricing is configured
- Update `onboarding-complete` edge function

---

## Edge Function Updates

### Update: `onboarding-complete/index.ts`
Add pricing mode validation:
```typescript
// For lab_staff role
if (!pricing_mode || !['TEMPLATE', 'CUSTOM'].includes(pricing_mode)) {
  throw new Error('Pricing mode must be configured');
}

// Store pricing_mode in labs table
await supabaseClient
  .from('labs')
  .update({ 
    pricing_mode,
    pricing_configured_at: new Date().toISOString()
  })
  .eq('id', labId);

// If CUSTOM mode, save pricing entries
if (pricing_mode === 'CUSTOM' && pricing_entries?.length > 0) {
  await supabaseClient
    .from('lab_pricing')
    .insert(pricing_entries.map(p => ({
      lab_id: labId,
      ...p
    })));
}
```

---

## Visibility Implementation

### Where Pricing Should Be Visible

| Surface | Template Mode | Custom Mode |
|---------|---------------|-------------|
| Homepage Lab Cards | "From EGP 120" + "Platform Pricing" badge | "From EGP XX" + "Custom Pricing" badge |
| Lab Profile Preview (Modal) | Full template prices | Full custom prices |
| Lab Profile Page | Full template prices with label | Full custom prices with label |
| Lab Admin Dashboard | Read-only template viewer | Editable pricing setup |
| Order Summary | Locked price snapshot | Locked price snapshot |

### Price Display Component Hierarchy
```text
<LabPricingDisplay>
  ├── props: labId, pricingMode, showLabel
  ├── if TEMPLATE → <TemplatePricingViewer readOnly />
  └── if CUSTOM → <LabPricingSetup labId readOnly />
```

---

## Backend Enforcement

### Order Creation Validation
Update order creation to check:
```sql
-- Block order creation if lab has no pricing configured
CREATE OR REPLACE FUNCTION validate_lab_pricing()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM labs 
    WHERE id = NEW.assigned_lab_id 
    AND pricing_mode IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Lab has not configured pricing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Invoice Generation
Already implemented to check:
1. `agreed_fee` from bid (highest priority)
2. `lab_pricing` for custom pricing
3. `pricing_rules` for template pricing (fallback)

---

## Price Locking & Versioning

### At Order Creation
When an order is placed:
1. Lock the active price to `lab_work_requests.price_snapshot`
2. Store `sla_days_snapshot` and `rush_surcharge_snapshot`
3. Reference this snapshot in invoice generation

### Pricing Changes
When a lab updates pricing:
1. Set `is_current = false` on old records
2. Insert new records with `version = old_version + 1`
3. Set `effective_from = now()`, `effective_until = NULL`
4. Log change to `lab_pricing_history`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/labs/PricingModeSelector.tsx` | Onboarding pricing choice modal |
| `src/components/billing/TemplatePricingViewer.tsx` | Read-only template pricing display |
| `src/components/billing/LabPricingDisplay.tsx` | Wrapper that shows correct pricing based on mode |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Onboarding.tsx` | Add pricing step for labs |
| `src/pages/LabAdmin.tsx` | Add pricing mode management, template viewer |
| `src/pages/LabProfile.tsx` | Show pricing with mode label |
| `src/components/labs/LabProfilePreview.tsx` | Add pricing section |
| `src/components/labs/LabCard.tsx` | Add price preview |
| `src/pages/Labs.tsx` | Fetch pricing data for labs |
| `supabase/functions/onboarding-complete/index.ts` | Add pricing mode validation |
| Migration SQL | Add columns and tables |

---

## User Experience Flow

### Lab Onboarding (New)
```text
Step 1: Choose Role → "Lab Staff"
Step 2: Lab Information → Name, License, Tax ID, Address
Step 3: Pricing Configuration → [NEW]
        ├── Option A: Use Platform Template Pricing
        │   └── Review template prices → Confirm
        └── Option B: Configure Custom Pricing
            └── Enter prices per restoration type → Save
Step 4: Welcome Animation
```

### Lab Pricing Change (Post-Onboarding)
```text
Lab Admin → Pricing Tab
├── Current Mode: [TEMPLATE | CUSTOM]
├── [Switch Mode] Button
│   └── Warning: "Changes apply to future orders only"
├── Pricing Display:
│   ├── If TEMPLATE: Read-only template viewer
│   └── If CUSTOM: Editable LabPricingSetup
└── [View Pricing History] → Audit log
```

---

## Technical Implementation Notes

### Pricing Mode State
```typescript
type PricingMode = 'TEMPLATE' | 'CUSTOM';

interface Lab {
  // ... existing fields
  pricing_mode: PricingMode | null;
  pricing_configured_at: string | null;
}
```

### Template Pricing Fetch
```typescript
// Fetch platform template pricing
const { data: templatePricing } = useQuery({
  queryKey: ['template-pricing'],
  queryFn: async () => {
    const { data } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('rule_type', 'base_price')
      .eq('is_active', true);
    return data;
  }
});
```

### Price Display Logic
```typescript
const getPricingData = (lab: Lab) => {
  if (lab.pricing_mode === 'TEMPLATE') {
    return { source: 'template', data: templatePricing };
  } else if (lab.pricing_mode === 'CUSTOM') {
    return { source: 'custom', data: labPricing };
  }
  return { source: 'none', data: null };
};
```

---

## Expected Outcomes

1. Every lab must explicitly choose TEMPLATE or CUSTOM pricing
2. Labs cannot be listed or receive orders without pricing configuration
3. Template pricing is visible to labs (read-only) and doctors (always)
4. Custom pricing is visible on lab profiles
5. All pricing changes are versioned and auditable
6. Orders are locked to pricing at creation time
7. Consistent pricing display across all surfaces
