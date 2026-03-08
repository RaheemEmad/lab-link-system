
-- Order Templates table for quick reorder functionality
CREATE TABLE public.order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  restoration_type text,
  teeth_shade text,
  shade_system text DEFAULT 'VITA Classical',
  teeth_number text,
  biological_notes text,
  urgency text DEFAULT 'Normal',
  handling_instructions text,
  assigned_lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL,
  is_favorite boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own templates
CREATE POLICY "Users can view own templates"
  ON public.order_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own templates"
  ON public.order_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.order_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.order_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Index for fast lookup
CREATE INDEX idx_order_templates_user_id ON public.order_templates(user_id);
