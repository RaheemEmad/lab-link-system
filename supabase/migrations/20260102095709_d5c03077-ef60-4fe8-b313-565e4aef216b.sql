-- Enable realtime for feedback room tables (use IF NOT EXISTS pattern)
DO $$
BEGIN
  -- Check if tables are already in publication before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback_room_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_room_attachments;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback_room_checklist_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_room_checklist_items;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback_room_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_room_comments;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback_room_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_room_activity;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback_room_decisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_room_decisions;
  END IF;
END $$;

-- Create function to log feedback room activity
CREATE OR REPLACE FUNCTION public.log_feedback_room_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role TEXT;
  v_action_desc TEXT;
BEGIN
  -- Determine user role
  IF has_role(auth.uid(), 'doctor'::app_role) THEN
    v_user_role := 'doctor';
  ELSIF has_role(auth.uid(), 'lab_staff'::app_role) THEN
    v_user_role := 'lab_staff';
  ELSE
    v_user_role := 'unknown';
  END IF;

  -- Build action description based on table and operation
  IF TG_TABLE_NAME = 'feedback_room_attachments' THEN
    v_action_desc := 'Uploaded file: ' || NEW.file_name;
    INSERT INTO feedback_room_activity (order_id, user_id, user_role, action_type, action_description, metadata)
    VALUES (NEW.order_id, auth.uid(), v_user_role, 'attachment_uploaded', v_action_desc, 
      jsonb_build_object('file_name', NEW.file_name, 'category', NEW.category, 'attachment_id', NEW.id));
  ELSIF TG_TABLE_NAME = 'feedback_room_checklist_items' AND TG_OP = 'INSERT' THEN
    v_action_desc := 'Added checklist item: ' || NEW.item_name;
    INSERT INTO feedback_room_activity (order_id, user_id, user_role, action_type, action_description, metadata)
    VALUES (NEW.order_id, auth.uid(), v_user_role, 'checklist_item_added', v_action_desc,
      jsonb_build_object('item_name', NEW.item_name, 'checklist_id', NEW.id));
  ELSIF TG_TABLE_NAME = 'feedback_room_checklist_items' AND TG_OP = 'UPDATE' THEN
    IF NEW.doctor_confirmed = true AND (OLD.doctor_confirmed IS NULL OR OLD.doctor_confirmed = false) THEN
      v_action_desc := 'Doctor confirmed: ' || NEW.item_name;
      INSERT INTO feedback_room_activity (order_id, user_id, user_role, action_type, action_description, metadata)
      VALUES (NEW.order_id, auth.uid(), 'doctor', 'checklist_confirmed', v_action_desc,
        jsonb_build_object('item_name', NEW.item_name, 'confirmed_by', 'doctor', 'checklist_id', NEW.id));
    ELSIF NEW.lab_confirmed = true AND (OLD.lab_confirmed IS NULL OR OLD.lab_confirmed = false) THEN
      v_action_desc := 'Lab confirmed: ' || NEW.item_name;
      INSERT INTO feedback_room_activity (order_id, user_id, user_role, action_type, action_description, metadata)
      VALUES (NEW.order_id, auth.uid(), 'lab_staff', 'checklist_confirmed', v_action_desc,
        jsonb_build_object('item_name', NEW.item_name, 'confirmed_by', 'lab', 'checklist_id', NEW.id));
    END IF;
  ELSIF TG_TABLE_NAME = 'feedback_room_comments' AND TG_OP = 'INSERT' THEN
    v_action_desc := 'Added comment';
    INSERT INTO feedback_room_activity (order_id, user_id, user_role, action_type, action_description, metadata)
    VALUES (NEW.order_id, auth.uid(), v_user_role, 'comment_added', v_action_desc,
      jsonb_build_object('comment_id', NEW.id, 'attachment_id', NEW.attachment_id));
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop existing triggers if they exist and recreate
DROP TRIGGER IF EXISTS log_attachment_activity ON public.feedback_room_attachments;
DROP TRIGGER IF EXISTS log_checklist_activity ON public.feedback_room_checklist_items;
DROP TRIGGER IF EXISTS log_comment_activity ON public.feedback_room_comments;

CREATE TRIGGER log_attachment_activity
AFTER INSERT ON public.feedback_room_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_feedback_room_activity();

CREATE TRIGGER log_checklist_activity
AFTER INSERT OR UPDATE ON public.feedback_room_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.log_feedback_room_activity();

CREATE TRIGGER log_comment_activity
AFTER INSERT ON public.feedback_room_comments
FOR EACH ROW EXECUTE FUNCTION public.log_feedback_room_activity();

-- Function to notify lab when doctor adds checklist item
CREATE OR REPLACE FUNCTION public.notify_lab_on_checklist_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_lab_user RECORD;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  
  -- Only notify if order has assigned lab
  IF v_order.assigned_lab_id IS NOT NULL THEN
    -- Notify all lab staff assigned to this order
    FOR v_lab_user IN 
      SELECT user_id FROM order_assignments WHERE order_id = NEW.order_id
    LOOP
      INSERT INTO notifications (user_id, order_id, type, title, message)
      VALUES (
        v_lab_user.user_id,
        NEW.order_id,
        'checklist_item_added',
        'New Checklist Item Added',
        'Doctor added a new checklist item: ' || NEW.item_name || ' for order ' || v_order.order_number
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_lab_checklist_item ON public.feedback_room_checklist_items;

CREATE TRIGGER notify_lab_checklist_item
AFTER INSERT ON public.feedback_room_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.notify_lab_on_checklist_item();