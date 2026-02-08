-- ======================================================
-- Migration: Fix Billing Issues and Add Invoice Features
-- ======================================================

-- 1. Fix generate_invoice_for_order function - change 'order_delivery' to 'delivery_confirmed'
CREATE OR REPLACE FUNCTION generate_invoice_for_order(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_order RECORD;
  v_invoice_number text;
  v_price numeric := 0;
  v_price_source text := 'default';
BEGIN
  -- Fetch order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if order is delivered and confirmed
  IF v_order.status != 'Delivered' THEN
    RAISE EXCEPTION 'Order must be delivered before generating invoice';
  END IF;

  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Invoice already exists for this order';
  END IF;

  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Determine price based on priority:
  -- 1. Agreed fee from bid/work request
  -- 2. Lab-specific pricing
  -- 3. Platform template pricing
  
  -- Check for agreed fee from lab_work_requests
  SELECT lwr.price_snapshot INTO v_price
  FROM lab_work_requests lwr
  WHERE lwr.order_id = p_order_id
    AND lwr.status = 'accepted'
    AND lwr.price_snapshot IS NOT NULL
  LIMIT 1;
  
  IF v_price IS NOT NULL AND v_price > 0 THEN
    v_price_source := 'agreed_fee';
  ELSE
    -- Check for lab-specific pricing
    IF v_order.assigned_lab_id IS NOT NULL THEN
      SELECT lp.fixed_price INTO v_price
      FROM lab_pricing lp
      WHERE lp.lab_id = v_order.assigned_lab_id
        AND lp.restoration_type = v_order.restoration_type
        AND lp.is_current = true
      LIMIT 1;
      
      IF v_price IS NOT NULL AND v_price > 0 THEN
        v_price_source := 'lab_pricing';
      END IF;
    END IF;
    
    -- Fallback to template pricing
    IF v_price IS NULL OR v_price = 0 THEN
      SELECT pr.value INTO v_price
      FROM pricing_rules pr
      WHERE pr.rule_type = 'base_price'
        AND pr.restoration_type = v_order.restoration_type
        AND pr.is_active = true
      LIMIT 1;
      
      IF v_price IS NOT NULL THEN
        v_price_source := 'template';
      ELSE
        v_price := 100; -- Default fallback price
        v_price_source := 'default';
      END IF;
    END IF;
  END IF;

  -- Create the invoice
  INSERT INTO invoices (
    order_id,
    invoice_number,
    status,
    subtotal,
    adjustments_total,
    expenses_total,
    final_total,
    generated_at,
    due_date
  ) VALUES (
    p_order_id,
    v_invoice_number,
    'generated',
    v_price,
    0,
    0,
    v_price,
    now(),
    now() + interval '30 days'
  ) RETURNING id INTO v_invoice_id;

  -- Create line item - USE 'delivery_confirmed' NOT 'order_delivery'
  INSERT INTO invoice_line_items (
    invoice_id,
    line_type,
    description,
    quantity,
    unit_price,
    total_price,
    source_event,
    source_record_id,
    rule_applied
  ) VALUES (
    v_invoice_id,
    'restoration',
    v_order.restoration_type || ' - ' || COALESCE(v_order.teeth_number, 'N/A'),
    1,
    v_price,
    v_price,
    'delivery_confirmed',  -- FIXED: was 'order_delivery'
    p_order_id,
    v_price_source
  );

  -- Log the generation
  INSERT INTO billing_audit_log (
    invoice_id,
    action,
    performed_by,
    new_values,
    reason
  ) VALUES (
    v_invoice_id,
    'generated',
    p_user_id,
    jsonb_build_object(
      'status', 'generated',
      'subtotal', v_price,
      'price_source', v_price_source
    ),
    'Invoice generated from order delivery'
  );

  RETURN v_invoice_id;
END;
$$;

-- 2. Create resolve_invoice_dispute function
CREATE OR REPLACE FUNCTION resolve_invoice_dispute(
  p_invoice_id uuid,
  p_user_id uuid,
  p_resolution_action text,
  p_resolution_notes text DEFAULT NULL,
  p_adjustment_amount numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_previous_status text;
BEGIN
  -- Verify user is admin
  IF NOT has_role(p_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can resolve disputes';
  END IF;

  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_invoice.status != 'disputed' THEN
    RAISE EXCEPTION 'Invoice is not in disputed status';
  END IF;
  
  -- Get the previous status from audit log (status before dispute)
  SELECT old_values->>'status' INTO v_previous_status
  FROM billing_audit_log 
  WHERE invoice_id = p_invoice_id AND action = 'disputed' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Default to 'generated' if no previous status found
  v_previous_status := COALESCE(v_previous_status, 'generated');
  
  -- Handle adjustment if provided
  IF p_adjustment_amount IS NOT NULL AND p_adjustment_amount != 0 THEN
    INSERT INTO invoice_adjustments (
      invoice_id,
      adjustment_type,
      amount,
      reason,
      approved_by
    ) VALUES (
      p_invoice_id,
      'dispute_resolution',
      p_adjustment_amount,
      p_resolution_notes,
      p_user_id
    );
    
    -- Update invoice totals
    UPDATE invoices SET
      adjustments_total = adjustments_total + p_adjustment_amount,
      final_total = subtotal + adjustments_total + p_adjustment_amount - expenses_total,
      updated_at = now()
    WHERE id = p_invoice_id;
  END IF;
  
  -- Update invoice status back to previous status
  UPDATE invoices SET
    status = v_previous_status::invoice_status,
    dispute_resolved_at = now(),
    dispute_resolved_by = p_user_id,
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Log the resolution
  INSERT INTO billing_audit_log (
    invoice_id, 
    action, 
    performed_by, 
    old_values, 
    new_values, 
    reason
  ) VALUES (
    p_invoice_id, 
    'dispute_resolved', 
    p_user_id,
    jsonb_build_object('status', 'disputed'),
    jsonb_build_object(
      'status', v_previous_status,
      'resolution_action', p_resolution_action,
      'adjustment', p_adjustment_amount
    ),
    p_resolution_notes
  );

  -- Create notification for the disputing party
  INSERT INTO notifications (
    order_id,
    user_id,
    notification_type,
    message
  )
  SELECT 
    v_invoice.order_id,
    CASE 
      WHEN ur.role = 'doctor' THEN o.doctor_id
      ELSE p_user_id
    END,
    'invoice_update',
    'Your invoice dispute has been resolved: ' || p_resolution_action
  FROM orders o
  JOIN user_roles ur ON ur.user_id = o.doctor_id
  WHERE o.id = v_invoice.order_id;
  
  RETURN true;
END;
$$;

-- 3. Create invoice_requests table for doctors to request invoice generation
CREATE TABLE IF NOT EXISTS invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  status text CHECK (status IN ('pending', 'generated', 'rejected')) DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  notes text,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on invoice_requests
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;

-- Doctors can request invoices for their orders
CREATE POLICY "Doctors can create invoice requests for their orders"
ON invoice_requests FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND doctor_id = auth.uid())
);

-- Users can view relevant requests
CREATE POLICY "Users can view their own and assignable requests"
ON invoice_requests FOR SELECT TO authenticated
USING (
  requested_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'lab_staff'::app_role)
);

-- Admins and lab staff can update requests
CREATE POLICY "Staff can update invoice requests"
ON invoice_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'lab_staff'::app_role)
);

-- Add unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_requests_pending_order 
ON invoice_requests (order_id) 
WHERE status = 'pending';

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_requests_status ON invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_order_id ON invoice_requests(order_id);

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION resolve_invoice_dispute TO authenticated;