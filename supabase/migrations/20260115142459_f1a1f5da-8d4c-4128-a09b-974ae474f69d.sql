-- Phase 1: Make order-attachments bucket public and add storage policies
UPDATE storage.buckets 
SET public = true 
WHERE id = 'order-attachments';

-- Create storage policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can view order attachments' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Authenticated users can view order attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'order-attachments');
  END IF;
END $$;

-- Phase 2: Create activity logging function
CREATE OR REPLACE FUNCTION public.log_feedback_activity(
  p_order_id UUID,
  p_user_id UUID,
  p_user_role TEXT,
  p_action_type TEXT,
  p_action_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO feedback_room_activity (
    order_id, 
    user_id, 
    user_role, 
    action_type, 
    action_description, 
    metadata
  )
  VALUES (
    p_order_id, 
    p_user_id, 
    p_user_role, 
    p_action_type, 
    p_action_description, 
    p_metadata
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_feedback_activity TO authenticated;

-- Phase 3: Create QC to Feedback Room sync trigger
CREATE OR REPLACE FUNCTION public.sync_qc_to_feedback_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When QC item is completed, log activity and optionally sync to feedback room
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    -- Log activity in feedback room
    INSERT INTO feedback_room_activity (
      order_id,
      user_id,
      user_role,
      action_type,
      action_description,
      metadata
    )
    VALUES (
      NEW.order_id,
      NEW.completed_by,
      'lab_staff',
      'qc_completed',
      'QC Step completed: ' || NEW.item_name,
      jsonb_build_object(
        'qc_item_id', NEW.id, 
        'item_name', NEW.item_name,
        'notes', NEW.notes, 
        'photo_url', NEW.photo_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS sync_qc_to_feedback_trigger ON qc_checklist_items;
CREATE TRIGGER sync_qc_to_feedback_trigger
AFTER UPDATE ON qc_checklist_items
FOR EACH ROW
EXECUTE FUNCTION sync_qc_to_feedback_room();

-- Phase 4: Create trigger to copy doctor photos to feedback room when lab is assigned
CREATE OR REPLACE FUNCTION public.copy_order_photos_to_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photo_url TEXT;
  photo_urls TEXT[];
  url_index INT := 1;
BEGIN
  -- Only when lab is first assigned
  IF NEW.assigned_lab_id IS NOT NULL AND (OLD.assigned_lab_id IS NULL OR OLD.assigned_lab_id != NEW.assigned_lab_id) THEN
    IF NEW.photos_link IS NOT NULL AND NEW.photos_link != '' THEN
      photo_urls := string_to_array(NEW.photos_link, ',');
      FOREACH photo_url IN ARRAY photo_urls
      LOOP
        -- Skip empty strings
        IF trim(photo_url) != '' THEN
          INSERT INTO feedback_room_attachments (
            order_id, 
            uploaded_by, 
            file_url, 
            file_name, 
            file_type, 
            category, 
            is_latest,
            version_number
          )
          VALUES (
            NEW.id, 
            NEW.doctor_id, 
            trim(photo_url), 
            'Doctor Photo ' || url_index, 
            'image/jpeg', 
            'photos', 
            true,
            1
          )
          ON CONFLICT DO NOTHING;
          url_index := url_index + 1;
        END IF;
      END LOOP;
      
      -- Log activity
      INSERT INTO feedback_room_activity (
        order_id,
        user_id,
        user_role,
        action_type,
        action_description,
        metadata
      )
      VALUES (
        NEW.id,
        NEW.doctor_id,
        'doctor',
        'photos_imported',
        'Doctor photos imported to Feedback Room',
        jsonb_build_object('photo_count', url_index - 1)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS copy_order_photos_trigger ON orders;
CREATE TRIGGER copy_order_photos_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION copy_order_photos_to_feedback();