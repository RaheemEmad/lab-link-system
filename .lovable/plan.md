
# Integration Plan: Complete Payment Tracking & Monthly Summary

## Summary
This plan completes the billing system integration by:
1. Wiring up the PaymentDialog in InvoicePreview
2. Adding the Monthly Summary button to BillingTab
3. Implementing automatic overdue detection on invoice load

---

## 1. Wire Up PaymentDialog in InvoicePreview

### Current Issue
The `PaymentDialog` component is imported and there's state for it (`showPaymentDialog`), but it's not actually rendered in the JSX.

### Changes to `src/components/billing/InvoicePreview.tsx`

Add the PaymentDialog component after the DisputeDialog (around line 825):

```tsx
<PaymentDialog
  open={showPaymentDialog}
  onOpenChange={setShowPaymentDialog}
  invoiceId={invoice.id}
  currentStatus={invoice.payment_status}
  currentAmountPaid={invoice.amount_paid || 0}
  currentDueDate={invoice.due_date}
  currentPaymentReceivedAt={invoice.payment_received_at}
  finalTotal={invoice.final_total}
/>
```

---

## 2. Add Monthly Summary to BillingTab

### Changes to `src/components/billing/BillingTab.tsx`

**Add import:**
```tsx
import MonthlyBillingSummary from "./MonthlyBillingSummary";
```

**Add state:**
```tsx
const [showMonthlySummary, setShowMonthlySummary] = useState(false);
```

**Add button in the Invoice Generation card** (next to "Generate Invoices"):
```tsx
<Button variant="outline" onClick={() => setShowMonthlySummary(true)} className="gap-2">
  <FileText className="h-4 w-4" />
  Monthly Summary
</Button>
```

**Add component render:**
```tsx
<MonthlyBillingSummary 
  open={showMonthlySummary} 
  onOpenChange={setShowMonthlySummary} 
/>
```

---

## 3. Automatic Overdue Detection

### Logic
When invoices are loaded, check each invoice to see if:
- `due_date` has passed (is in the past)
- `payment_status` is 'pending' or 'partial' (not already 'paid')

If both conditions are true, automatically update the status to 'overdue'.

### Implementation in `src/components/billing/BillingTab.tsx`

**Add mutation for overdue updates:**
```tsx
const updateOverdueMutation = useMutation({
  mutationFn: async (invoiceId: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({ payment_status: 'overdue' })
      .eq('id', invoiceId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  }
});
```

**Add useEffect to check overdue on load:**
```tsx
useEffect(() => {
  if (!invoices) return;
  
  invoices.forEach(invoice => {
    if (
      invoice.due_date &&
      isPast(startOfDay(new Date(invoice.due_date))) &&
      (invoice.payment_status === 'pending' || invoice.payment_status === 'partial' || !invoice.payment_status)
    ) {
      updateOverdueMutation.mutate(invoice.id);
    }
  });
}, [invoices]);
```

**Add imports:**
```tsx
import { isPast, startOfDay } from "date-fns";
import { useEffect } from "react";
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/billing/InvoicePreview.tsx` | Add PaymentDialog render at line ~825 |
| `src/components/billing/BillingTab.tsx` | Add MonthlyBillingSummary import, state, button, and auto-overdue detection |

---

## Expected Outcome

1. **Payment Dialog** - Clicking "Update Payment" in InvoicePreview opens the PaymentDialog
2. **Monthly Summary** - New button in BillingTab opens the monthly summary dialog with PDF export
3. **Auto-Overdue** - Invoices with past due dates automatically get marked as 'overdue' when the billing tab loads

---

## Technical Details

### Overdue Detection Flow
```text
User opens Billing Tab
       |
       v
  Invoices loaded
       |
       v
  For each invoice:
       |
       v
  Check: due_date exists?
       |
    Yes |
       v
  Check: due_date < today?
       |
    Yes |
       v
  Check: status NOT 'paid'?
       |
    Yes |
       v
  Update to 'overdue'
```

### Calendar Date Picker Fix
The Calendar component in PaymentDialog already has `pointer-events-auto` which ensures it works correctly inside the dialog overlay.
