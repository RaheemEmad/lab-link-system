-- Create storage bucket for QC photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('qc-photos', 'qc-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for QC photos
CREATE POLICY "Lab staff can upload QC photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'qc-photos' 
  AND has_role(auth.uid(), 'lab_staff')
);

CREATE POLICY "Lab staff can view QC photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'qc-photos' 
  AND (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Lab staff can delete QC photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'qc-photos' 
  AND has_role(auth.uid(), 'lab_staff')
);

-- Create QC checklist items table
CREATE TABLE public.qc_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qc_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for QC checklist items
CREATE POLICY "Lab staff can view QC items for their lab's orders"
ON public.qc_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.user_roles ur ON ur.lab_id = o.assigned_lab_id
    WHERE o.id = qc_checklist_items.order_id
    AND ur.user_id = auth.uid()
    AND (ur.role = 'lab_staff' OR ur.role = 'admin')
  )
);

CREATE POLICY "Lab staff can insert QC items"
ON public.qc_checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.user_roles ur ON ur.lab_id = o.assigned_lab_id
    WHERE o.id = qc_checklist_items.order_id
    AND ur.user_id = auth.uid()
    AND (ur.role = 'lab_staff' OR ur.role = 'admin')
  )
);

CREATE POLICY "Lab staff can update QC items"
ON public.qc_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.user_roles ur ON ur.lab_id = o.assigned_lab_id
    WHERE o.id = qc_checklist_items.order_id
    AND ur.user_id = auth.uid()
    AND (ur.role = 'lab_staff' OR ur.role = 'admin')
  )
);

CREATE POLICY "Lab staff can delete QC items"
ON public.qc_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.user_roles ur ON ur.lab_id = o.assigned_lab_id
    WHERE o.id = qc_checklist_items.order_id
    AND ur.user_id = auth.uid()
    AND (ur.role = 'lab_staff' OR ur.role = 'admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_qc_checklist_items_updated_at
BEFORE UPDATE ON public.qc_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for QC checklist items
ALTER PUBLICATION supabase_realtime ADD TABLE public.qc_checklist_items;

-- Create function to initialize default QC checklist for an order
CREATE OR REPLACE FUNCTION public.initialize_qc_checklist(order_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default QC checklist items
  INSERT INTO public.qc_checklist_items (order_id, item_name, item_description)
  VALUES
    (order_id_param, 'Material Quality Check', 'Verify material meets specifications and quality standards'),
    (order_id_param, 'Dimensional Accuracy', 'Check dimensions match the prescribed specifications'),
    (order_id_param, 'Shade Verification', 'Confirm shade matches the requested shade'),
    (order_id_param, 'Surface Finish', 'Inspect surface for smoothness and proper finish'),
    (order_id_param, 'Marginal Fit', 'Verify proper marginal fit and adaptation'),
    (order_id_param, 'Occlusion Check', 'Check occlusal contacts and adjustments'),
    (order_id_param, 'Final Cleaning', 'Ensure restoration is properly cleaned and polished'),
    (order_id_param, 'Packaging Inspection', 'Verify proper packaging for safe delivery');
END;
$$;