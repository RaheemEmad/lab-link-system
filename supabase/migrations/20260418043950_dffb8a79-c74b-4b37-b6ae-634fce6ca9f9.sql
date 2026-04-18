
-- Support ticket replies for two-way communication
CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('user', 'admin')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id
  ON public.support_ticket_replies(ticket_id, created_at);

ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Ticket owner OR admin can read replies
CREATE POLICY "Ticket participants can view replies"
  ON public.support_ticket_replies FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- Ticket owner can reply to their own ticket; admins can reply to any
CREATE POLICY "Ticket participants can create replies"
  ON public.support_ticket_replies FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      (author_role = 'admin' AND public.has_role(auth.uid(), 'admin'))
      OR (
        author_role = 'user'
        AND EXISTS (
          SELECT 1 FROM public.support_tickets t
          WHERE t.id = ticket_id AND t.user_id = auth.uid()
        )
      )
    )
  );

-- Allow admins to update tickets (status, admin_notes already covered, but ensure)
DROP POLICY IF EXISTS "Admins can update any ticket" ON public.support_tickets;
CREATE POLICY "Admins can update any ticket"
  ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER TABLE public.support_ticket_replies REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_replies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Notify the OTHER party when a reply is added
CREATE OR REPLACE FUNCTION public.notify_support_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_recipient_id uuid;
  v_title text;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.author_role = 'admin' THEN
    v_recipient_id := v_ticket.user_id;
    v_title := 'Support team replied';
  ELSE
    -- Notify all admins
    INSERT INTO public.admin_notifications (category, severity, title, message, metadata)
    VALUES (
      'support',
      'info',
      'New ticket reply: ' || v_ticket.subject,
      left(NEW.message, 200),
      jsonb_build_object('ticket_id', v_ticket.id, 'user_id', v_ticket.user_id)
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, order_id, type, title, message)
  VALUES (
    v_recipient_id,
    NEW.ticket_id, -- reuse order_id col as the reference id
    'support_reply',
    v_title,
    left(NEW.message, 200)
  );

  -- Bump ticket updated_at + status
  UPDATE public.support_tickets
  SET updated_at = now(),
      status = CASE WHEN status = 'closed' THEN status ELSE 'in_progress' END
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_support_ticket_reply ON public.support_ticket_replies;
CREATE TRIGGER trg_notify_support_ticket_reply
  AFTER INSERT ON public.support_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_reply();

-- Notify admins on new ticket creation
CREATE OR REPLACE FUNCTION public.notify_new_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (category, severity, title, message, metadata)
  VALUES (
    'support',
    CASE WHEN NEW.priority = 'high' THEN 'warning' ELSE 'info' END,
    'New support ticket: ' || NEW.subject,
    left(NEW.description, 200),
    jsonb_build_object('ticket_id', NEW.id, 'user_id', NEW.user_id, 'category', NEW.category)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_support_ticket();

-- Ensure admin profiles auto-complete onboarding (no clinic/specialty required)
CREATE OR REPLACE FUNCTION public.auto_complete_admin_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    UPDATE public.profiles
    SET onboarding_completed = true
    WHERE id = NEW.user_id AND COALESCE(onboarding_completed, false) = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_admin_onboarding ON public.user_roles;
CREATE TRIGGER trg_auto_complete_admin_onboarding
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.auto_complete_admin_onboarding();

-- Backfill existing admins
UPDATE public.profiles p
SET onboarding_completed = true
FROM public.user_roles ur
WHERE ur.user_id = p.id
  AND ur.role = 'admin'
  AND COALESCE(p.onboarding_completed, false) = false;
