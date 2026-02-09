-- Fix generate_invoice_for_order: cast restoration_type enum to text for comparisons
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
  v_restoration_type_text text;
BEGIN
  -- Fetch order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Cast restoration_type enum to text once
  v_restoration_type_text := v_order.restoration_type::text;

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

  -- Determine price: 1. Agreed fee, 2. Lab pricing, 3. Template pricing
  SELECT lwr.price_snapshot INTO v_price
  FROM lab_work_requests lwr
  WHERE lwr.order_id = p_order_id
    AND lwr.status = 'accepted'
    AND lwr.price_snapshot IS NOT NULL
  LIMIT 1;
  
  IF v_price IS NOT NULL AND v_price > 0 THEN
    v_price_source := 'agreed_fee';
  ELSE
    IF v_order.assigned_lab_id IS NOT NULL THEN
      SELECT lp.fixed_price INTO v_price
      FROM lab_pricing lp
      WHERE lp.lab_id = v_order.assigned_lab_id
        AND lp.restoration_type = v_restoration_type_text
        AND lp.is_current = true
      LIMIT 1;
      
      IF v_price IS NOT NULL AND v_price > 0 THEN
        v_price_source := 'lab_pricing';
      END IF;
    END IF;
    
    IF v_price IS NULL OR v_price = 0 THEN
      SELECT pr.value INTO v_price
      FROM pricing_rules pr
      WHERE pr.rule_type = 'base_price'
        AND pr.restoration_type = v_restoration_type_text
        AND pr.is_active = true
      LIMIT 1;
      
      IF v_price IS NOT NULL THEN
        v_price_source := 'template';
      ELSE
        v_price := 100;
        v_price_source := 'default';
      END IF;
    END IF;
  END IF;

  -- Create the invoice
  INSERT INTO invoices (
    order_id, invoice_number, status, subtotal,
    adjustments_total, expenses_total, final_total,
    generated_at, due_date
  ) VALUES (
    p_order_id, v_invoice_number, 'generated', v_price,
    0, 0, v_price, now(), now() + interval '30 days'
  ) RETURNING id INTO v_invoice_id;

  -- Create line item
  INSERT INTO invoice_line_items (
    invoice_id, line_type, description, quantity,
    unit_price, total_price, source_event, source_record_id, rule_applied
  ) VALUES (
    v_invoice_id, 'restoration',
    v_restoration_type_text || ' - ' || COALESCE(v_order.teeth_number, 'N/A'),
    1, v_price, v_price, 'delivery_confirmed', p_order_id, v_price_source
  );

  -- Log the generation
  INSERT INTO billing_audit_log (
    invoice_id, action, performed_by, new_values, reason
  ) VALUES (
    v_invoice_id, 'generated', p_user_id,
    jsonb_build_object('status', 'generated', 'subtotal', v_price, 'price_source', v_price_source),
    'Invoice generated from order delivery'
  );

  RETURN v_invoice_id;
END;
$$;