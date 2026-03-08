
-- Credit notes table
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  issued_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Labs/admins who can see the invoice can see credit notes
CREATE POLICY "Users can view credit notes for accessible invoices" ON public.credit_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM invoices i
    JOIN orders o ON o.id = i.order_id
    WHERE i.id = credit_notes.invoice_id
    AND (o.doctor_id = auth.uid() OR has_role(auth.uid(), 'admin') OR
      (has_role(auth.uid(), 'lab_staff') AND EXISTS (
        SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
      ))
    )
  ));

CREATE POLICY "Lab staff and admins can create credit notes" ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lab_staff')
  );

-- Billing statements table
CREATE TABLE public.billing_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  invoice_ids jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.billing_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their statements" ON public.billing_statements
  FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Lab staff and admins can manage statements" ON public.billing_statements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lab_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lab_staff'));

-- Add payment method, reference, late fee, and share token to invoices
ALTER TABLE public.invoices
  ADD COLUMN payment_method text,
  ADD COLUMN payment_reference text,
  ADD COLUMN late_fee_percent numeric DEFAULT 0,
  ADD COLUMN late_fee_applied numeric DEFAULT 0,
  ADD COLUMN share_token text UNIQUE;

-- Add late fee policy to labs
ALTER TABLE public.labs
  ADD COLUMN late_fee_policy_percent numeric DEFAULT 0;
