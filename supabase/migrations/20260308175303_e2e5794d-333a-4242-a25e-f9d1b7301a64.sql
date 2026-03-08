-- 1. Remove the dangerous self-role-assignment policy
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- 2. Fix invoice_line_items: replace public "System can manage line items" with service_role-only
DROP POLICY IF EXISTS "System can manage line items" ON public.invoice_line_items;
CREATE POLICY "Service role can manage line items"
  ON public.invoice_line_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Fix invoices: replace public system policies with service_role-only
DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "System can update invoices" ON public.invoices;
CREATE POLICY "Service role can create invoices"
  ON public.invoices
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update invoices"
  ON public.invoices
  FOR UPDATE
  TO service_role
  USING (true);

-- 4. Fix billing_statements cross-lab access: drop and recreate scoped policy
DROP POLICY IF EXISTS "Lab staff and admins can manage statements" ON public.billing_statements;
CREATE POLICY "Admins can manage all statements"
  ON public.billing_statements
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Lab staff can manage their lab statements"
  ON public.billing_statements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'lab_staff'::app_role
        AND user_roles.lab_id = billing_statements.lab_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'lab_staff'::app_role
        AND user_roles.lab_id = billing_statements.lab_id
    )
  );