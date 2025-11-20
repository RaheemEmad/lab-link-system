-- Create order_assignments table for assignment-based access control
CREATE TABLE IF NOT EXISTS public.order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, user_id)
);

-- Enable RLS on order_assignments
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_assignments
-- Admins and lab staff can view assignments
CREATE POLICY "View assignments"
  ON public.order_assignments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'lab_staff'::app_role) OR
    user_id = auth.uid()
  );

-- Only admins can create assignments
CREATE POLICY "Admins can create assignments"
  ON public.order_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete assignments
CREATE POLICY "Admins can delete assignments"
  ON public.order_assignments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the orders RLS policy to use assignment-based access
DROP POLICY IF EXISTS "Doctors can view their own orders" ON public.orders;

CREATE POLICY "Doctors and assigned lab staff can view orders"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid() = doctor_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'lab_staff'::app_role) AND 
     EXISTS (
       SELECT 1 FROM public.order_assignments 
       WHERE order_id = orders.id AND user_id = auth.uid()
     ))
  );

-- Update other orders policies to maintain admin access
DROP POLICY IF EXISTS "Lab staff can update orders" ON public.orders;

CREATE POLICY "Assigned lab staff and admins can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'lab_staff'::app_role) AND 
     EXISTS (
       SELECT 1 FROM public.order_assignments 
       WHERE order_id = orders.id AND user_id = auth.uid()
     ))
  );

DROP POLICY IF EXISTS "Lab staff and admins can delete orders" ON public.orders;

CREATE POLICY "Assigned lab staff and admins can delete orders"
  ON public.orders
  FOR DELETE
  USING (
    auth.uid() = doctor_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    (has_role(auth.uid(), 'lab_staff'::app_role) AND 
     EXISTS (
       SELECT 1 FROM public.order_assignments 
       WHERE order_id = orders.id AND user_id = auth.uid()
     ))
  );