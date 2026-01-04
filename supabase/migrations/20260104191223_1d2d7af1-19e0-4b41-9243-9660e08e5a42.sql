-- =====================================================
-- BILLING SYSTEM - Core Tables & Functions
-- =====================================================

-- 1. Create invoice_status enum
CREATE TYPE invoice_status AS ENUM ('draft', 'generated', 'locked', 'finalized', 'disputed');

-- 2. Create invoices table (one per order)
CREATE TABLE public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    status invoice_status NOT NULL DEFAULT 'draft',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    adjustments_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    expenses_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    final_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    generated_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID,
    disputed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_order_invoice UNIQUE (order_id)
);

-- 3. Create invoice_line_items table
CREATE TABLE public.invoice_line_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    line_type TEXT NOT NULL CHECK (line_type IN ('base_price', 'urgency_fee', 'rework', 'sla_penalty', 'sla_bonus', 'multi_unit', 'adjustment')),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    source_event TEXT NOT NULL CHECK (source_event IN ('order_created', 'lab_accepted', 'delivery_confirmed', 'feedback_approved', 'admin_override', 'rework_detected', 'sla_calculation')),
    source_record_id UUID,
    rule_applied TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create invoice_adjustments table
CREATE TABLE public.invoice_adjustments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('discount', 'credit', 'penalty', 'bonus', 'correction')),
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
    approved_by UUID NOT NULL,
    source_event TEXT,
    source_record_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create logistics_expenses table
CREATE TABLE public.logistics_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('delivery', 're_delivery', 'courier', 'packaging', 'pickup', 'other')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    incurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by UUID NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create pricing_rules table
CREATE TABLE public.pricing_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('base_price', 'multiplier', 'flat_fee', 'penalty', 'bonus')),
    restoration_type restoration_type,
    urgency_level urgency_level,
    condition JSONB DEFAULT '{}',
    amount NUMERIC(12,2) NOT NULL,
    is_percentage BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create billing_audit_log table
CREATE TABLE public.billing_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'generated', 'line_added', 'adjusted', 'locked', 'finalized', 'disputed', 'dispute_resolved', 'expense_added', 'expense_linked')),
    performed_by UUID,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Doctors can view their order invoices" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND orders.doctor_id = auth.uid()
        )
    );

CREATE POLICY "Labs can view assigned order invoices" ON public.invoices
    FOR SELECT USING (
        has_role(auth.uid(), 'lab_staff') AND EXISTS (
            SELECT 1 FROM order_assignments 
            WHERE order_assignments.order_id = invoices.order_id 
            AND order_assignments.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all invoices" ON public.invoices
    FOR ALL USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update invoices" ON public.invoices
    FOR UPDATE USING (true);

-- Invoice line items policies
CREATE POLICY "Users can view line items for accessible invoices" ON public.invoice_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN orders o ON o.id = i.order_id
            WHERE i.id = invoice_line_items.invoice_id
            AND (
                o.doctor_id = auth.uid()
                OR has_role(auth.uid(), 'admin')
                OR (has_role(auth.uid(), 'lab_staff') AND EXISTS (
                    SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "System can manage line items" ON public.invoice_line_items
    FOR ALL USING (true) WITH CHECK (true);

-- Invoice adjustments policies
CREATE POLICY "Users can view adjustments for accessible invoices" ON public.invoice_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN orders o ON o.id = i.order_id
            WHERE i.id = invoice_adjustments.invoice_id
            AND (
                o.doctor_id = auth.uid()
                OR has_role(auth.uid(), 'admin')
                OR (has_role(auth.uid(), 'lab_staff') AND EXISTS (
                    SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Admins can manage adjustments" ON public.invoice_adjustments
    FOR ALL USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Logistics expenses policies
CREATE POLICY "Users can view expenses for their orders" ON public.logistics_expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = logistics_expenses.order_id
            AND (
                o.doctor_id = auth.uid()
                OR has_role(auth.uid(), 'admin')
                OR (has_role(auth.uid(), 'lab_staff') AND EXISTS (
                    SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "Labs can add expenses for assigned orders" ON public.logistics_expenses
    FOR INSERT WITH CHECK (
        recorded_by = auth.uid() AND (
            has_role(auth.uid(), 'admin')
            OR (has_role(auth.uid(), 'lab_staff') AND EXISTS (
                SELECT 1 FROM order_assignments oa WHERE oa.order_id = logistics_expenses.order_id AND oa.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Labs can update their expenses" ON public.logistics_expenses
    FOR UPDATE USING (
        recorded_by = auth.uid() OR has_role(auth.uid(), 'admin')
    );

-- Pricing rules policies
CREATE POLICY "Authenticated users can view pricing rules" ON public.pricing_rules
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage pricing rules" ON public.pricing_rules
    FOR ALL USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Billing audit log policies
CREATE POLICY "Admins can view all billing audit logs" ON public.billing_audit_log
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view audit logs for their invoices" ON public.billing_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN orders o ON o.id = i.order_id
            WHERE i.id = billing_audit_log.invoice_id
            AND (
                o.doctor_id = auth.uid()
                OR (has_role(auth.uid(), 'lab_staff') AND EXISTS (
                    SELECT 1 FROM order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()
                ))
            )
        )
    );

CREATE POLICY "System can insert billing audit logs" ON public.billing_audit_log
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- Functions
-- =====================================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    year_month TEXT;
    seq_num INTEGER;
    new_invoice_number TEXT;
BEGIN
    year_month := to_char(now(), 'YYYYMM');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ ('^INV-' || year_month || '-[0-9]+$')
            THEN CAST(split_part(invoice_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1 INTO seq_num
    FROM invoices;
    
    new_invoice_number := 'INV-' || year_month || '-' || lpad(seq_num::TEXT, 4, '0');
    RETURN new_invoice_number;
END;
$$;

-- Calculate and apply pricing rules
CREATE OR REPLACE FUNCTION calculate_invoice_line_items(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_invoice_id UUID;
    v_rule RECORD;
    v_base_price NUMERIC(12,2) := 0;
    v_teeth_count INTEGER;
    v_is_urgent BOOLEAN;
    v_is_late BOOLEAN := false;
    v_is_early BOOLEAN := false;
    v_days_diff INTEGER;
    v_rework_count INTEGER;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Get or create invoice
    SELECT id INTO v_invoice_id FROM invoices WHERE order_id = p_order_id;
    IF NOT FOUND THEN
        INSERT INTO invoices (order_id, invoice_number, status)
        VALUES (p_order_id, generate_invoice_number(), 'draft')
        RETURNING id INTO v_invoice_id;
        
        INSERT INTO billing_audit_log (invoice_id, action, new_values)
        VALUES (v_invoice_id, 'created', jsonb_build_object('order_id', p_order_id));
    END IF;
    
    -- Clear existing line items (for recalculation)
    DELETE FROM invoice_line_items WHERE invoice_id = v_invoice_id;
    
    -- Count teeth units
    v_teeth_count := array_length(string_to_array(v_order.teeth_number, ','), 1);
    IF v_teeth_count IS NULL OR v_teeth_count = 0 THEN
        v_teeth_count := 1;
    END IF;
    
    -- Check urgency
    v_is_urgent := v_order.urgency = 'Urgent';
    
    -- Check SLA compliance
    IF v_order.actual_delivery_date IS NOT NULL AND v_order.expected_delivery_date IS NOT NULL THEN
        v_days_diff := v_order.actual_delivery_date::DATE - v_order.expected_delivery_date::DATE;
        v_is_late := v_days_diff > 0;
        v_is_early := v_days_diff < 0;
    END IF;
    
    -- Count reworks (status went backwards in history)
    SELECT COUNT(*) INTO v_rework_count
    FROM order_status_history osh
    WHERE osh.order_id = p_order_id
    AND osh.old_status IS NOT NULL
    AND (
        (osh.old_status = 'Ready for QC' AND osh.new_status = 'In Progress')
        OR (osh.old_status = 'Ready for Delivery' AND osh.new_status IN ('In Progress', 'Ready for QC'))
    );
    
    -- Apply base price rule
    FOR v_rule IN 
        SELECT * FROM pricing_rules 
        WHERE rule_type = 'base_price' 
        AND is_active = true 
        AND (restoration_type IS NULL OR restoration_type = v_order.restoration_type)
        ORDER BY priority ASC, restoration_type NULLS LAST
        LIMIT 1
    LOOP
        v_base_price := v_rule.amount;
        
        INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
        VALUES (
            v_invoice_id,
            'base_price',
            v_order.restoration_type::TEXT || ' - Base Price',
            v_teeth_count,
            v_rule.amount,
            v_rule.amount * v_teeth_count,
            'order_created',
            v_rule.rule_name
        );
    END LOOP;
    
    -- If no base price rule, use order price or default
    IF v_base_price = 0 THEN
        v_base_price := COALESCE(v_order.price, 100);
        INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
        VALUES (
            v_invoice_id,
            'base_price',
            v_order.restoration_type::TEXT || ' - Base Price',
            v_teeth_count,
            v_base_price,
            v_base_price * v_teeth_count,
            'order_created',
            'order_price_fallback'
        );
    END IF;
    
    -- Apply urgency fee
    IF v_is_urgent THEN
        FOR v_rule IN 
            SELECT * FROM pricing_rules 
            WHERE rule_type = 'multiplier' 
            AND rule_name LIKE '%urgency%'
            AND is_active = true 
            ORDER BY priority ASC
            LIMIT 1
        LOOP
            IF v_rule.is_percentage THEN
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
                VALUES (
                    v_invoice_id,
                    'urgency_fee',
                    'Urgency Fee (' || v_rule.amount || '%)',
                    1,
                    (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    'order_created',
                    v_rule.rule_name
                );
            ELSE
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
                VALUES (
                    v_invoice_id,
                    'urgency_fee',
                    'Urgency Fee (Flat)',
                    1,
                    v_rule.amount,
                    v_rule.amount,
                    'order_created',
                    v_rule.rule_name
                );
            END IF;
        END LOOP;
    END IF;
    
    -- Apply SLA penalty
    IF v_is_late THEN
        FOR v_rule IN 
            SELECT * FROM pricing_rules 
            WHERE rule_type = 'penalty' 
            AND rule_name LIKE '%late%'
            AND is_active = true 
            ORDER BY priority ASC
            LIMIT 1
        LOOP
            IF v_rule.is_percentage THEN
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
                VALUES (
                    v_invoice_id,
                    'sla_penalty',
                    'SLA Penalty - ' || v_days_diff || ' day(s) late (' || v_rule.amount || '%/day)',
                    v_days_diff,
                    (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    -1 * v_days_diff * (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    'sla_calculation',
                    v_rule.rule_name
                );
            ELSE
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
                VALUES (
                    v_invoice_id,
                    'sla_penalty',
                    'SLA Penalty - ' || v_days_diff || ' day(s) late',
                    v_days_diff,
                    v_rule.amount,
                    -1 * v_days_diff * v_rule.amount,
                    'sla_calculation',
                    v_rule.rule_name
                );
            END IF;
        END LOOP;
    END IF;
    
    -- Apply SLA bonus for early delivery
    IF v_is_early AND ABS(v_days_diff) >= 1 THEN
        FOR v_rule IN 
            SELECT * FROM pricing_rules 
            WHERE rule_type = 'bonus' 
            AND rule_name LIKE '%early%'
            AND is_active = true 
            ORDER BY priority ASC
            LIMIT 1
        LOOP
            IF v_rule.is_percentage THEN
                INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
                VALUES (
                    v_invoice_id,
                    'sla_bonus',
                    'Early Delivery Bonus (' || v_rule.amount || '%)',
                    1,
                    (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    (v_base_price * v_teeth_count) * (v_rule.amount / 100),
                    'sla_calculation',
                    v_rule.rule_name
                );
            END IF;
        END LOOP;
    END IF;
    
    -- Apply rework fees
    IF v_rework_count > 0 THEN
        FOR v_rule IN 
            SELECT * FROM pricing_rules 
            WHERE rule_type = 'flat_fee' 
            AND rule_name LIKE '%rework%'
            AND is_active = true 
            ORDER BY priority ASC
            LIMIT 1
        LOOP
            INSERT INTO invoice_line_items (invoice_id, line_type, description, quantity, unit_price, total_price, source_event, rule_applied)
            VALUES (
                v_invoice_id,
                'rework',
                'Rework Fee',
                v_rework_count,
                v_rule.amount,
                v_rule.amount * v_rework_count,
                'rework_detected',
                v_rule.rule_name
            );
        END LOOP;
    END IF;
    
    -- Update invoice totals
    UPDATE invoices SET
        subtotal = COALESCE((SELECT SUM(total_price) FROM invoice_line_items WHERE invoice_id = v_invoice_id), 0),
        updated_at = now()
    WHERE id = v_invoice_id;
    
    -- Recalculate final total
    UPDATE invoices SET
        final_total = subtotal + adjustments_total - expenses_total,
        updated_at = now()
    WHERE id = v_invoice_id;
END;
$$;

-- Generate invoice (triggered after delivery + approval)
CREATE OR REPLACE FUNCTION generate_invoice_for_order(p_order_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_invoice_id UUID;
    v_existing_invoice_id UUID;
BEGIN
    -- Get order
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Check if delivery is confirmed
    IF v_order.delivery_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Delivery not confirmed - cannot generate invoice';
    END IF;
    
    -- Check if invoice already exists
    SELECT id INTO v_existing_invoice_id FROM invoices WHERE order_id = p_order_id;
    
    -- Calculate line items (creates invoice if not exists)
    PERFORM calculate_invoice_line_items(p_order_id);
    
    -- Get invoice id
    SELECT id INTO v_invoice_id FROM invoices WHERE order_id = p_order_id;
    
    -- Link any existing expenses
    UPDATE logistics_expenses SET invoice_id = v_invoice_id WHERE order_id = p_order_id AND invoice_id IS NULL;
    
    -- Recalculate expenses total
    UPDATE invoices SET
        expenses_total = COALESCE((SELECT SUM(amount) FROM logistics_expenses WHERE invoice_id = v_invoice_id), 0),
        updated_at = now()
    WHERE id = v_invoice_id;
    
    -- Recalculate final total
    UPDATE invoices SET
        final_total = subtotal + adjustments_total - expenses_total,
        updated_at = now()
    WHERE id = v_invoice_id;
    
    -- Update status to generated
    UPDATE invoices SET
        status = 'generated',
        generated_at = COALESCE(generated_at, now()),
        updated_at = now()
    WHERE id = v_invoice_id;
    
    -- Log audit
    INSERT INTO billing_audit_log (invoice_id, action, performed_by, new_values)
    VALUES (v_invoice_id, 'generated', p_user_id, jsonb_build_object(
        'status', 'generated',
        'generated_at', now()
    ));
    
    RETURN v_invoice_id;
END;
$$;

-- Lock invoice
CREATE OR REPLACE FUNCTION lock_invoice(p_invoice_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    IF v_invoice.status NOT IN ('draft', 'generated') THEN
        RAISE EXCEPTION 'Invoice cannot be locked from status: %', v_invoice.status;
    END IF;
    
    UPDATE invoices SET
        status = 'locked',
        locked_at = now(),
        updated_at = now()
    WHERE id = p_invoice_id;
    
    INSERT INTO billing_audit_log (invoice_id, action, performed_by, old_values, new_values)
    VALUES (p_invoice_id, 'locked', p_user_id, 
        jsonb_build_object('status', v_invoice.status),
        jsonb_build_object('status', 'locked', 'locked_at', now())
    );
    
    RETURN true;
END;
$$;

-- Finalize invoice (immutable after this)
CREATE OR REPLACE FUNCTION finalize_invoice(p_invoice_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    IF v_invoice.status NOT IN ('locked') THEN
        RAISE EXCEPTION 'Invoice must be locked before finalizing. Current status: %', v_invoice.status;
    END IF;
    
    UPDATE invoices SET
        status = 'finalized',
        finalized_at = now(),
        finalized_by = p_user_id,
        updated_at = now()
    WHERE id = p_invoice_id;
    
    INSERT INTO billing_audit_log (invoice_id, action, performed_by, old_values, new_values)
    VALUES (p_invoice_id, 'finalized', p_user_id, 
        jsonb_build_object('status', v_invoice.status),
        jsonb_build_object('status', 'finalized', 'finalized_at', now(), 'finalized_by', p_user_id)
    );
    
    RETURN true;
END;
$$;

-- Raise dispute
CREATE OR REPLACE FUNCTION raise_invoice_dispute(p_invoice_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    IF v_invoice.status IN ('draft', 'disputed') THEN
        RAISE EXCEPTION 'Cannot dispute invoice in status: %', v_invoice.status;
    END IF;
    
    UPDATE invoices SET
        status = 'disputed',
        disputed_at = now(),
        dispute_reason = p_reason,
        updated_at = now()
    WHERE id = p_invoice_id;
    
    INSERT INTO billing_audit_log (invoice_id, action, performed_by, old_values, new_values, reason)
    VALUES (p_invoice_id, 'disputed', p_user_id, 
        jsonb_build_object('status', v_invoice.status),
        jsonb_build_object('status', 'disputed', 'disputed_at', now()),
        p_reason
    );
    
    RETURN true;
END;
$$;

-- =====================================================
-- Insert Default Pricing Rules
-- =====================================================

INSERT INTO pricing_rules (rule_name, rule_type, restoration_type, amount, is_percentage, priority) VALUES
    ('zirconia_base_price', 'base_price', 'Zirconia', 150, false, 10),
    ('emax_base_price', 'base_price', 'E-max', 180, false, 10),
    ('pfm_base_price', 'base_price', 'PFM', 120, false, 10),
    ('metal_base_price', 'base_price', 'Metal', 100, false, 10),
    ('acrylic_base_price', 'base_price', 'Acrylic', 80, false, 10),
    ('crown_base_price', 'base_price', 'Crown', 140, false, 10),
    ('bridge_base_price', 'base_price', 'Bridge', 200, false, 10),
    ('zirconia_layer_base_price', 'base_price', 'Zirconia Layer', 170, false, 10),
    ('zircomax_base_price', 'base_price', 'Zirco-Max', 190, false, 10),
    ('urgency_fee', 'multiplier', NULL, 25, true, 20),
    ('sla_late_penalty', 'penalty', NULL, 5, true, 30),
    ('sla_early_bonus', 'bonus', NULL, 5, true, 30),
    ('rework_fee', 'flat_fee', NULL, 30, false, 40);

-- =====================================================
-- Enable Realtime
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_line_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logistics_expenses;