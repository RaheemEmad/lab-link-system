
-- Doctor Verification table
CREATE TABLE public.doctor_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  completed_order_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view doctor verification"
  ON public.doctor_verification FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System/admin can insert doctor verification"
  ON public.doctor_verification FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System/admin can update doctor verification"
  ON public.doctor_verification FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Lab Invitations table
CREATE TABLE public.lab_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  invited_email text,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff can manage their invitations"
  ON public.lab_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'lab_staff'::app_role
        AND user_roles.lab_id = lab_invitations.lab_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'lab_staff'::app_role
        AND user_roles.lab_id = lab_invitations.lab_id
    )
  );

CREATE POLICY "Admins can manage all invitations"
  ON public.lab_invitations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Doctors can view invitations for their email"
  ON public.lab_invitations FOR SELECT
  TO authenticated
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR accepted_by = auth.uid()
  );

-- Function to update doctor verification when order is delivered
CREATE OR REPLACE FUNCTION public.update_doctor_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Only trigger when status changes to 'Delivered'
  IF NEW.status = 'Delivered' AND (OLD.status IS NULL OR OLD.status != 'Delivered') THEN
    -- Upsert doctor verification record
    INSERT INTO public.doctor_verification (user_id, completed_order_count, is_verified, verified_at, verification_status)
    VALUES (
      NEW.doctor_id,
      1,
      false,
      NULL,
      'pending'
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      completed_order_count = doctor_verification.completed_order_count + 1,
      updated_at = now();

    -- Check if threshold reached (3 completed orders)
    SELECT completed_order_count INTO v_count
    FROM public.doctor_verification
    WHERE user_id = NEW.doctor_id;

    IF v_count >= 3 THEN
      UPDATE public.doctor_verification
      SET is_verified = true,
          verified_at = COALESCE(verified_at, now()),
          verification_status = 'verified',
          updated_at = now()
      WHERE user_id = NEW.doctor_id AND is_verified = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_doctor_verification
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_doctor_verification();

-- Trigger for updated_at
CREATE TRIGGER update_doctor_verification_updated_at
  BEFORE UPDATE ON public.doctor_verification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_invitations_updated_at
  BEFORE UPDATE ON public.lab_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for invitation lookups
CREATE INDEX idx_lab_invitations_code ON public.lab_invitations(invite_code);
CREATE INDEX idx_lab_invitations_email ON public.lab_invitations(invited_email);
CREATE INDEX idx_lab_invitations_lab ON public.lab_invitations(lab_id);
