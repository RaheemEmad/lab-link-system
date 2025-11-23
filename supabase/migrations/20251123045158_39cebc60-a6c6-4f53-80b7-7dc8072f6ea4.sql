-- Function to notify users when a new note is added
CREATE OR REPLACE FUNCTION notify_on_new_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_note_author_name text;
  v_user_id uuid;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
  
  -- Get note author name
  SELECT COALESCE(full_name, email) INTO v_note_author_name 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notify doctor if they didn't write the note
  IF v_order.doctor_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, order_id, type, title, message)
    VALUES (
      v_order.doctor_id,
      NEW.order_id,
      'new_note',
      'New Note on Order ' || v_order.order_number,
      v_note_author_name || ' added a note'
    );
  END IF;
  
  -- Notify assigned lab staff if they didn't write the note
  FOR v_user_id IN 
    SELECT DISTINCT oa.user_id 
    FROM order_assignments oa
    WHERE oa.order_id = NEW.order_id 
    AND oa.user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, order_id, type, title, message)
    VALUES (
      v_user_id,
      NEW.order_id,
      'new_note',
      'New Note on Order ' || v_order.order_number,
      v_note_author_name || ' added a note'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify users when a note is liked
CREATE OR REPLACE FUNCTION notify_on_note_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_author_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_liker_name text;
BEGIN
  -- Get note author and order details
  SELECT notes.user_id, notes.order_id, ord.order_number
  INTO v_note_author_id, v_order_id, v_order_number
  FROM order_notes notes
  JOIN orders ord ON ord.id = notes.order_id
  WHERE notes.id = NEW.note_id;
  
  -- Get liker name
  SELECT COALESCE(full_name, email) INTO v_liker_name 
  FROM profiles WHERE id = NEW.user_id;
  
  -- Only notify if someone else liked the note (not the author)
  IF v_note_author_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, order_id, type, title, message)
    VALUES (
      v_note_author_id,
      v_order_id,
      'note_liked',
      'Note Liked on Order ' || v_order_number,
      v_liker_name || ' liked your note'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS on_new_note ON order_notes;
CREATE TRIGGER on_new_note
  AFTER INSERT ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_note();

DROP TRIGGER IF EXISTS on_note_like ON note_likes;
CREATE TRIGGER on_note_like
  AFTER INSERT ON note_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_note_like();