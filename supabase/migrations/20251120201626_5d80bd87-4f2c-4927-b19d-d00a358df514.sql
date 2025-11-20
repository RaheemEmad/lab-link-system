-- Create notifications table to track notification history
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'new_note', 'assignment')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can create notifications (via triggers/functions)
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Update the notify_order_status_change function to log notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  doctor_user_id UUID;
  assignment_record RECORD;
BEGIN
  -- Get the doctor's user_id
  SELECT doctor_id INTO doctor_user_id FROM public.orders WHERE id = NEW.id;
  
  -- Create notification for doctor
  IF doctor_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      doctor_user_id,
      NEW.id,
      'status_change',
      'Order ' || NEW.order_number || ' Status Updated',
      'Status changed from ' || COALESCE(OLD.status::text, 'N/A') || ' to ' || NEW.status::text
    );
  END IF;
  
  -- Create notifications for assigned lab staff
  FOR assignment_record IN 
    SELECT user_id FROM public.order_assignments WHERE order_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      assignment_record.user_id,
      NEW.id,
      'status_change',
      'Order ' || NEW.order_number || ' Status Updated',
      'Status changed from ' || COALESCE(OLD.status::text, 'N/A') || ' to ' || NEW.status::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update the notify_new_note function to log notifications
CREATE OR REPLACE FUNCTION public.notify_new_note()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  assignment_record RECORD;
  note_author_name TEXT;
BEGIN
  -- Get order details
  SELECT order_number, doctor_id, patient_name INTO order_record 
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Get note author name
  SELECT COALESCE(full_name, email) INTO note_author_name
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify doctor (if not the author)
  IF order_record.doctor_id IS NOT NULL AND order_record.doctor_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, order_id, type, title, message)
    VALUES (
      order_record.doctor_id,
      NEW.order_id,
      'new_note',
      'New Note on Order ' || order_record.order_number,
      note_author_name || ' added a note to ' || order_record.patient_name || '''s order'
    );
  END IF;
  
  -- Notify assigned lab staff (if not the author)
  FOR assignment_record IN 
    SELECT user_id FROM public.order_assignments WHERE order_id = NEW.order_id
  LOOP
    IF assignment_record.user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, order_id, type, title, message)
      VALUES (
        assignment_record.user_id,
        NEW.order_id,
        'new_note',
        'New Note on Order ' || order_record.order_number,
        note_author_name || ' added a note to ' || order_record.patient_name || '''s order'
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;