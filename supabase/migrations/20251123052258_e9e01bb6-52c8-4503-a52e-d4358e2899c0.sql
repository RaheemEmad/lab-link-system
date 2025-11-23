-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-attachments',
  'order-attachments',
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'model/stl', 'application/sla', 'application/octet-stream']
);

-- Storage policies for order attachments
CREATE POLICY "Doctors can upload attachments for their orders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments for accessible orders"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-attachments' AND
  (
    -- Doctor can see their own uploads
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Lab staff can see attachments for assigned orders
    EXISTS (
      SELECT 1 FROM orders o
      JOIN order_assignments oa ON oa.order_id = o.id
      WHERE o.id::text = (storage.foldername(name))[2]
      AND oa.user_id = auth.uid()
    ) OR
    -- Admins can see all
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'order-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add new columns to orders table
ALTER TABLE public.orders
ADD COLUMN desired_delivery_date DATE,
ADD COLUMN proposed_delivery_date DATE,
ADD COLUMN delivery_date_comment TEXT,
ADD COLUMN carrier_name TEXT,
ADD COLUMN carrier_phone TEXT;

-- Create order_attachments table
CREATE TABLE public.order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  attachment_category TEXT NOT NULL CHECK (attachment_category IN ('radiograph', 'stl', 'intraoral_photo', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on order_attachments
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_attachments
CREATE POLICY "Users can insert attachments for accessible orders"
ON public.order_attachments FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND doctor_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'lab_staff'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can view attachments for accessible orders"
ON public.order_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_id AND (
      doctor_id = auth.uid() OR
      has_role(auth.uid(), 'lab_staff'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.order_attachments FOR DELETE
USING (auth.uid() = uploaded_by);

-- Add index for performance
CREATE INDEX idx_order_attachments_order_id ON public.order_attachments(order_id);

-- Trigger to update updated_at
CREATE TRIGGER update_order_attachments_updated_at
BEFORE UPDATE ON public.order_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();