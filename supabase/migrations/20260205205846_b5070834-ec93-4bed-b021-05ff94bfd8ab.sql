-- Drop existing function first
DROP FUNCTION IF EXISTS public.generate_invoice_for_order(uuid, uuid);

-- Part 1: Fix the check constraint for invoice_line_items
ALTER TABLE invoice_line_items 
DROP CONSTRAINT IF EXISTS invoice_line_items_line_type_check;

ALTER TABLE invoice_line_items 
ADD CONSTRAINT invoice_line_items_line_type_check 
CHECK (line_type = ANY (ARRAY[
  'base_price', 
  'urgency_fee', 
  'rework', 
  'sla_penalty', 
  'sla_bonus', 
  'multi_unit', 
  'adjustment',
  'agreed_fee'
]));

-- Part 2: Recreate generate_invoice_for_order with lab_pricing support
CREATE FUNCTION public.generate_invoice_for_order(p_order_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_order record;
  v_unit_price numeric;
  v_quantity integer;
  v_total numeric;
  v_lab_pricing record;
  v_global_pricing record;
  v_agreed_price numeric;
BEGIN
  -- Get order details
  SELECT o.*, lwr.bid_amount, lwr.revised_amount
  INTO v_order
  FROM orders o
  LEFT JOIN lab_work_requests lwr ON lwr.order_id = o.id 
    AND lwr.status = 'accepted'
  WHERE o.id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Invoice already exists for this order';
  END IF;

  -- Calculate quantity from teeth_number
  v_quantity := COALESCE(
    array_length(string_to_array(v_order.teeth_number, ','), 1),
    1
  );

  -- Priority 1: Check for agreed price from bid (revised or original)
  v_agreed_price := COALESCE(v_order.revised_amount, v_order.bid_amount);
  
  IF v_agreed_price IS NOT NULL THEN
    v_unit_price := v_agreed_price / v_quantity;
    v_total := v_agreed_price;
  ELSE
    -- Priority 2: Check lab-specific pricing
    SELECT * INTO v_lab_pricing
    FROM lab_pricing
    WHERE lab_id = v_order.assigned_lab_id
      AND restoration_type = v_order.restoration_type;

    IF v_lab_pricing IS NOT NULL AND v_lab_pricing.fixed_price IS NOT NULL THEN
      v_unit_price := v_lab_pricing.fixed_price;
      v_total := v_unit_price * v_quantity;
      
      -- Add rush surcharge if applicable
      IF v_order.urgency = 'Urgent' AND v_lab_pricing.rush_surcharge_percent IS NOT NULL THEN
        v_total := v_total * (1 + v_lab_pricing.rush_surcharge_percent / 100);
      END IF;
    ELSE
      -- Priority 3: Check global pricing rules
      SELECT * INTO v_global_pricing
      FROM pricing_rules
      WHERE restoration_type = v_order.restoration_type
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_global_pricing IS NOT NULL THEN
        v_unit_price := v_global_pricing.base_price_egp;
        v_total := v_unit_price * v_quantity;
      ELSE
        -- Fallback to order price or default
        v_unit_price := COALESCE(v_order.price / NULLIF(v_quantity, 0), 100);
        v_total := COALESCE(v_order.price, v_unit_price * v_quantity);
      END IF;
    END IF;
  END IF;

  -- Generate invoice number
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || 
    lpad((floor(random() * 10000))::text, 4, '0');

  -- Create invoice
  INSERT INTO invoices (
    order_id,
    invoice_number,
    subtotal,
    final_total,
    status,
    generated_at
  ) VALUES (
    p_order_id,
    v_invoice_number,
    v_total,
    v_total,
    'draft',
    now()
  ) RETURNING id INTO v_invoice_id;

  -- Create line item with appropriate type
  INSERT INTO invoice_line_items (
    invoice_id,
    line_type,
    description,
    quantity,
    unit_price,
    total_price,
    source_event
  ) VALUES (
    v_invoice_id,
    CASE 
      WHEN v_agreed_price IS NOT NULL THEN 'agreed_fee'
      ELSE 'base_price'
    END,
    v_order.restoration_type || ' (' || v_quantity || ' units)',
    v_quantity,
    v_unit_price,
    v_total,
    'order_delivery'
  );

  -- Log the action
  INSERT INTO billing_audit_log (
    invoice_id,
    action,
    performed_by,
    new_values
  ) VALUES (
    v_invoice_id,
    'created',
    p_user_id,
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'total', v_total,
      'order_id', p_order_id
    )
  );

  RETURN v_invoice_id;
END;
$$;