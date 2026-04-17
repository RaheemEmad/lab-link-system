
-- TEAM INVITATIONS
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_role app_role NOT NULL,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_lab ON public.team_invitations(lab_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(lower(invited_email));
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff view own lab invitations"
ON public.team_invitations FOR SELECT TO authenticated
USING (
  lab_id IN (SELECT lab_id FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Lab staff create invitations for own lab"
ON public.team_invitations FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (
    lab_id IN (SELECT lab_id FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Lab staff update own lab invitations"
ON public.team_invitations FOR UPDATE TO authenticated
USING (
  lab_id IN (SELECT lab_id FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL)
  OR public.has_role(auth.uid(), 'admin')
);

-- AUTO-ONBOARD INVITED USERS
CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation_record record;
BEGIN
  SELECT * INTO invitation_record
  FROM public.team_invitations
  WHERE lower(invited_email) = lower(NEW.email)
    AND status = 'pending' AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF invitation_record.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, lab_id, created_by)
    VALUES (NEW.id, invitation_record.invited_role, invitation_record.lab_id, invitation_record.invited_by)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.team_invitations
    SET status = 'accepted', accepted_by = NEW.id, accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_handle_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user();

-- LAB GALLERY
CREATE TABLE IF NOT EXISTS public.lab_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  case_type text,
  material text,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_gallery_lab ON public.lab_gallery(lab_id, sort_order);

ALTER TABLE public.lab_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lab gallery"
ON public.lab_gallery FOR SELECT USING (true);

CREATE POLICY "Lab staff manage own gallery"
ON public.lab_gallery FOR ALL TO authenticated
USING (
  lab_id IN (SELECT lab_id FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL)
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  lab_id IN (SELECT lab_id FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_lab_gallery_updated_at
BEFORE UPDATE ON public.lab_gallery
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-gallery', 'lab-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lab-gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'lab-gallery');

CREATE POLICY "Lab staff upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lab-gallery'
  AND (storage.foldername(name))[1] IN (
    SELECT lab_id::text FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL
  )
);

CREATE POLICY "Lab staff update own gallery files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lab-gallery'
  AND (storage.foldername(name))[1] IN (
    SELECT lab_id::text FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL
  )
);

CREATE POLICY "Lab staff delete own gallery files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lab-gallery'
  AND (storage.foldername(name))[1] IN (
    SELECT lab_id::text FROM public.user_roles WHERE user_id = auth.uid() AND lab_id IS NOT NULL
  )
);

-- AGGREGATE STATS RPC (fixed)
CREATE OR REPLACE FUNCTION public.get_lab_aggregate_stats(p_lab_id uuid)
RETURNS TABLE (
  avg_overall numeric,
  avg_quality numeric,
  avg_turnaround numeric,
  avg_communication numeric,
  avg_value numeric,
  avg_accuracy numeric,
  total_reviews bigint,
  on_time_percentage numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROUND(AVG(r.rating)::numeric, 2),
    ROUND(AVG(r.quality_rating)::numeric, 2),
    ROUND(AVG(r.turnaround_rating)::numeric, 2),
    ROUND(AVG(r.communication_rating)::numeric, 2),
    ROUND(AVG(r.value_rating)::numeric, 2),
    ROUND(AVG(r.accuracy_rating)::numeric, 2),
    COUNT(*)::bigint,
    COALESCE(
      (SELECT ROUND((m.on_time_deliveries::numeric * 100.0) / NULLIF(m.total_orders, 0), 1)
       FROM public.lab_performance_metrics m WHERE m.lab_id = p_lab_id LIMIT 1),
      0
    )
  FROM public.lab_reviews r
  WHERE r.lab_id = p_lab_id;
$$;
