-- =====================================================
-- BIDDING SYSTEM + AUTOMATED INVOICE GENERATION
-- =====================================================

-- 1. Add budget/bidding fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS target_budget NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agreed_fee NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agreed_fee_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agreed_fee_by_doctor UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS agreed_fee_by_lab UUID REFERENCES auth.users(id) DEFAULT NULL;

-- 2. Add bidding fields to lab_work_requests table
ALTER TABLE public.lab_work_requests
ADD COLUMN IF NOT EXISTS bid_amount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bid_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bid_status TEXT DEFAULT 'pending' CHECK (bid_status IN ('pending', 'accepted', 'refused', 'revision_requested', 'revised')),
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revision_request_note TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revised_amount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS revised_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Create pricing_rules_audit table for tracking changes
CREATE TABLE IF NOT EXISTS public.pricing_rules_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  changed_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_rules_audit
ALTER TABLE public.pricing_rules_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for pricing_rules_audit (admin only read/write)
CREATE POLICY "Admins can view pricing rules audit"
  ON public.pricing_rules_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert pricing rules audit"
  ON public.pricing_rules_audit FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Update generate_invoice_for_order to include agreed_fee as first line item
CREATE OR REPLACE FUNCTION public.generate_invoice_for_order(p_order_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_base_price NUMERIC := 0;
  v_urgency_fee NUMERIC := 0;
  v_teeth_count INTEGER := 1;
  v_sla_penalty NUMERIC := 0;
  v_sla_bonus NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_expenses_total NUMERIC := 0;
  v_rule RECORD;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Invoice already exists for this order';
  END IF;
  
  -- Generate invoice number
  v_invoice_number := generate_invoice_number();
  
  -- Create invoice record
  INSERT INTO invoices (
    order_id,
    invoice_number,
    status,
    subtotal,
    adjustments_total,
    expenses_total,
    final_total,
    generated_at
  ) VALUES (
    p_order_id,
    v_invoice_number,
    'generated',
    0,
    0,
    0,
    0,
    now()
  ) RETURNING id INTO v_invoice_id;
  
  -- If agreed_fee exists, use it as the primary line item
  IF v_order.agreed_fee IS NOT NULL AND v_order.agreed_fee > 0 THEN
    INSERT INTO invoice_line_items (
      invoice_id,
      line_type,
      description,
      quantity,
      unit_price,
      total_price,
      source_event,
      rule_applied
    ) VALUES (
      v_invoice_id,
      'agreed_fee',
      'Agreed Fee - Per Negotiation',
      1,
      v_order.agreed_fee,
      v_order.agreed_fee,
      'bid_accepted',
      'negotiated_price'
    );
    
    v_subtotal := v_order.agreed_fee;
  ELSE
    -- Fall back to pricing rules if no agreed fee
    -- Get base price from pricing rules
    SELECT amount INTO v_base_price
    FROM pricing_rules
    WHERE rule_type = 'base_price'
      AND restoration_type = v_order.restoration_type::restoration_type
      AND is_active = true
    ORDER BY priority
    LIMIT 1;
    
    IF v_base_price IS NULL THEN
      v_base_price := 100; -- Default base price
    END IF;
    
    -- Count teeth (rough estimate from teeth_number string)
    v_teeth_count := GREATEST(1, array_length(string_to_array(v_order.teeth_number, ','), 1));
    
    -- Add base price line item
    INSERT INTO invoice_line_items (
      invoice_id,
      line_type,
      description,
      quantity,
      unit_price,
      total_price,
      source_event,
      rule_applied
    ) VALUES (
      v_invoice_id,
      'base_price',
      'Base Price - ' || v_order.restoration_type,
      v_teeth_count,
      v_base_price,
      v_base_price * v_teeth_count,
      'order_created',
      v_order.restoration_type::TEXT || '_base_price'
    );
    
    v_subtotal := v_base_price * v_teeth_count;
    
    -- Apply urgency fee if urgent
    IF v_order.urgency = 'Urgent' THEN
      SELECT amount INTO v_urgency_fee
      FROM pricing_rules
      WHERE rule_type = 'multiplier'
        AND urgency_level = 'Urgent'
        AND is_active = true
      ORDER BY priority
      LIMIT 1;
      
      IF v_urgency_fee IS NOT NULL THEN
        v_urgency_fee := v_subtotal * (v_urgency_fee / 100);
        
        INSERT INTO invoice_line_items (
          invoice_id,
          line_type,
          description,
          quantity,
          unit_price,
          total_price,
          source_event,
          rule_applied
        ) VALUES (
          v_invoice_id,
          'urgency_fee',
          'Urgency Fee (Rush Order)',
          1,
          v_urgency_fee,
          v_urgency_fee,
          'order_created',
          'urgency_multiplier'
        );
        
        v_subtotal := v_subtotal + v_urgency_fee;
      END IF;
    END IF;
  END IF;
  
  -- Calculate SLA penalties/bonuses
  IF v_order.actual_delivery_date IS NOT NULL AND v_order.expected_delivery_date IS NOT NULL THEN
    IF v_order.actual_delivery_date::DATE > v_order.expected_delivery_date::DATE THEN
      -- Late delivery - penalty
      v_sla_penalty := v_subtotal * 0.05 * (v_order.actual_delivery_date::DATE - v_order.expected_delivery_date::DATE);
      v_sla_penalty := LEAST(v_sla_penalty, v_subtotal * 0.25); -- Cap at 25%
      
      INSERT INTO invoice_line_items (
        invoice_id,
        line_type,
        description,
        quantity,
        unit_price,
        total_price,
        source_event,
        rule_applied
      ) VALUES (
        v_invoice_id,
        'sla_penalty',
        'SLA Penalty - ' || (v_order.actual_delivery_date::DATE - v_order.expected_delivery_date::DATE) || ' days late',
        1,
        -v_sla_penalty,
        -v_sla_penalty,
        'delivery_confirmed',
        'sla_late_penalty'
      );
      
      v_subtotal := v_subtotal - v_sla_penalty;
    ELSIF v_order.actual_delivery_date::DATE < v_order.expected_delivery_date::DATE THEN
      -- Early delivery - bonus
      v_sla_bonus := v_subtotal * 0.03; -- 3% early delivery bonus
      
      INSERT INTO invoice_line_items (
        invoice_id,
        line_type,
        description,
        quantity,
        unit_price,
        total_price,
        source_event,
        rule_applied
      ) VALUES (
        v_invoice_id,
        'sla_bonus',
        'Early Delivery Bonus',
        1,
        v_sla_bonus,
        v_sla_bonus,
        'delivery_confirmed',
        'sla_early_bonus'
      );
      
      v_subtotal := v_subtotal + v_sla_bonus;
    END IF;
  END IF;
  
  -- Get total expenses for this order
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses_total
  FROM logistics_expenses
  WHERE order_id = p_order_id;
  
  -- Update invoice with final totals
  UPDATE invoices SET
    subtotal = v_subtotal,
    expenses_total = v_expenses_total,
    final_total = v_subtotal - v_expenses_total
  WHERE id = v_invoice_id;
  
  -- Link expenses to invoice
  UPDATE logistics_expenses SET invoice_id = v_invoice_id WHERE order_id = p_order_id;
  
  -- Add audit log
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
      'invoice_number', v_invoice_number,
      'subtotal', v_subtotal,
      'expenses_total', v_expenses_total,
      'final_total', v_subtotal - v_expenses_total,
      'agreed_fee_used', v_order.agreed_fee IS NOT NULL
    ),
    'Invoice generated for order ' || v_order.order_number
  );
  
  RETURN v_invoice_id;
END;
$$;

-- 5. Create function to check and auto-generate invoice
CREATE OR REPLACE FUNCTION public.check_auto_invoice_conditions(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_pending_approvals INTEGER;
  v_invoice_exists BOOLEAN;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if invoice already exists
  SELECT EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) INTO v_invoice_exists;
  IF v_invoice_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Check conditions:
  -- 1. Order is Delivered
  -- 2. delivery_confirmed_at is set
  -- 3. agreed_fee is set (negotiation complete)
  -- 4. All feedback room decisions are approved (if any exist)
  
  IF v_order.status != 'Delivered' THEN
    RETURN FALSE;
  END IF;
  
  IF v_order.delivery_confirmed_at IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_order.agreed_fee IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check feedback room decisions (if any exist, all must be approved)
  SELECT COUNT(*) INTO v_pending_approvals
  FROM feedback_room_decisions
  WHERE order_id = p_order_id
    AND (doctor_approved = FALSE OR lab_approved = FALSE);
  
  IF v_pending_approvals > 0 THEN
    RETURN FALSE;
  END IF;
  
  -- All conditions met
  RETURN TRUE;
END;
$$;

-- 6. Create trigger function for auto-invoice on delivery confirmation
CREATE OR REPLACE FUNCTION public.trigger_auto_invoice_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if delivery was just confirmed
  IF NEW.delivery_confirmed_at IS NOT NULL 
     AND (OLD.delivery_confirmed_at IS NULL OR OLD.delivery_confirmed_at != NEW.delivery_confirmed_at) THEN
    
    -- Check all conditions and generate invoice if met
    IF check_auto_invoice_conditions(NEW.id) THEN
      PERFORM generate_invoice_for_order(NEW.id, NEW.delivery_confirmed_by);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Create trigger function for auto-invoice on feedback approval
CREATE OR REPLACE FUNCTION public.trigger_auto_invoice_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this was an approval action
  IF (NEW.doctor_approved = TRUE AND (OLD.doctor_approved IS NULL OR OLD.doctor_approved = FALSE))
     OR (NEW.lab_approved = TRUE AND (OLD.lab_approved IS NULL OR OLD.lab_approved = FALSE)) THEN
    
    -- Check all conditions and generate invoice if met
    IF check_auto_invoice_conditions(NEW.order_id) THEN
      PERFORM generate_invoice_for_order(NEW.order_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create triggers
DROP TRIGGER IF EXISTS auto_invoice_on_delivery ON orders;
CREATE TRIGGER auto_invoice_on_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_invoice_on_delivery();

DROP TRIGGER IF EXISTS auto_invoice_on_approval ON feedback_room_decisions;
CREATE TRIGGER auto_invoice_on_approval
  AFTER UPDATE ON feedback_room_decisions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_invoice_on_approval();

-- 9. Enable realtime for pricing_rules_audit only (lab_work_requests already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'pricing_rules_audit'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules_audit;
  END IF;
END $$;