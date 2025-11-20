-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-files', 'design-files', false);

-- Storage policies for design files
CREATE POLICY "Lab staff can upload design files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-files' AND
  (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Lab staff can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Dentists can view design files for their orders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (
    has_role(auth.uid(), 'doctor') AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id::text = (storage.foldername(name))[1]
      AND orders.doctor_id = auth.uid()
    )
  )
);

CREATE POLICY "Lab staff can update design files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Lab staff can delete design files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'design-files' AND
  (has_role(auth.uid(), 'lab_staff') OR has_role(auth.uid(), 'admin'))
);

-- Create function to automatically progress order status on design approval
CREATE OR REPLACE FUNCTION public.auto_progress_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When design is approved, automatically move to next status
  IF NEW.design_approved = true AND (OLD.design_approved IS NULL OR OLD.design_approved = false) THEN
    -- If currently "Pending", move to "In Progress"
    IF NEW.status = 'Pending' THEN
      NEW.status := 'In Progress';
    -- If currently "In Progress", move to "Ready for QC"
    ELSIF NEW.status = 'In Progress' THEN
      NEW.status := 'Ready for QC';
    END IF;
    
    -- Notify dentist of approval
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      NEW.doctor_id,
      NEW.id,
      'design_approved',
      'Design Approved: ' || NEW.order_number,
      'Your design has been approved and the order is progressing to the next stage.'
    );
  END IF;
  
  -- When design is rejected
  IF NEW.design_approved = false AND (OLD.design_approved IS NULL OR OLD.design_approved = true) THEN
    -- Notify dentist of rejection
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      NEW.doctor_id,
      NEW.id,
      'design_rejected',
      'Design Revision Needed: ' || NEW.order_number,
      'The design requires revision. Approval notes: ' || COALESCE(NEW.approval_notes, 'No notes provided.')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-progression
DROP TRIGGER IF EXISTS trigger_auto_progress_on_approval ON public.orders;
CREATE TRIGGER trigger_auto_progress_on_approval
  BEFORE UPDATE OF design_approved
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_progress_on_approval();