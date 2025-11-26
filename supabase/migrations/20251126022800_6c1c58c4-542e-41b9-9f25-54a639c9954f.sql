-- Phase 1: Feedback Room Database Schema (Fixed)

-- 1. Versioned attachments for feedback room
CREATE TABLE feedback_room_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES feedback_room_attachments(id), -- version chain
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  version_number INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'general', -- 'scan', 'photo', 'design', 'qa'
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Threaded comments with pin positions (like Figma)
CREATE TABLE feedback_room_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES feedback_room_attachments(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES feedback_room_comments(id), -- threads
  user_id UUID NOT NULL REFERENCES profiles(id),
  user_role TEXT NOT NULL, -- 'doctor' or 'lab_staff'
  comment_text TEXT NOT NULL,
  pin_position JSONB, -- { x: 0.5, y: 0.3 } for positioned comments
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Quick reactions on files/comments
CREATE TABLE feedback_room_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID REFERENCES feedback_room_attachments(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES feedback_room_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  reaction_type TEXT NOT NULL, -- '👍', '❗', '🔄', '❓', '✅'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attachment_id, user_id, reaction_type),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- 4. Collaborative checklist per job type
CREATE TABLE feedback_room_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_description TEXT,
  display_order INT DEFAULT 0,
  doctor_confirmed BOOLEAN DEFAULT false,
  doctor_confirmed_by UUID REFERENCES profiles(id),
  doctor_confirmed_at TIMESTAMPTZ,
  lab_confirmed BOOLEAN DEFAULT false,
  lab_confirmed_by UUID REFERENCES profiles(id),
  lab_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Locked decisions between parties
CREATE TABLE feedback_room_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL, -- 'shade', 'material', 'units', 'due_date'
  decision_value TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  doctor_approved BOOLEAN DEFAULT false,
  doctor_approved_by UUID REFERENCES profiles(id),
  doctor_approved_at TIMESTAMPTZ,
  lab_approved BOOLEAN DEFAULT false,
  lab_approved_by UUID REFERENCES profiles(id),
  lab_approved_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activity timeline
CREATE TABLE feedback_room_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  user_role TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE feedback_room_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_room_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_room_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_room_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_room_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_room_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can access feedback room data for orders they're involved in

-- Attachments
CREATE POLICY "Users can view attachments for their orders"
ON feedback_room_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_attachments.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR (
        orders.assigned_lab_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can upload attachments to their orders"
ON feedback_room_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_attachments.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR (
        orders.assigned_lab_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);

-- Comments
CREATE POLICY "Users can view comments for their orders"
ON feedback_room_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_comments.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR (
        orders.assigned_lab_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can create comments on their orders"
ON feedback_room_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_comments.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR (
        orders.assigned_lab_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM order_assignments
          WHERE order_assignments.order_id = orders.id
          AND order_assignments.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON feedback_room_comments FOR UPDATE
USING (user_id = auth.uid());

-- Reactions
CREATE POLICY "Users can view reactions for their orders"
ON feedback_room_reactions FOR SELECT
USING (
  (attachment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM feedback_room_attachments a
    JOIN orders o ON o.id = a.order_id
    WHERE a.id = feedback_room_reactions.attachment_id
    AND (
      o.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = o.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  ))
  OR
  (comment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM feedback_room_comments c
    JOIN orders o ON o.id = c.order_id
    WHERE c.id = feedback_room_reactions.comment_id
    AND (
      o.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = o.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  ))
);

CREATE POLICY "Users can add reactions"
ON feedback_room_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions"
ON feedback_room_reactions FOR DELETE
USING (user_id = auth.uid());

-- Checklist Items
CREATE POLICY "Users can view checklist for their orders"
ON feedback_room_checklist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_checklist_items.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create checklist items"
ON feedback_room_checklist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_checklist_items.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update checklist items"
ON feedback_room_checklist_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_checklist_items.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

-- Decisions
CREATE POLICY "Users can view decisions for their orders"
ON feedback_room_decisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_decisions.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can manage decisions for their orders"
ON feedback_room_decisions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_decisions.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

-- Activity
CREATE POLICY "Users can view activity for their orders"
ON feedback_room_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = feedback_room_activity.order_id
    AND (
      orders.doctor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM order_assignments
        WHERE order_assignments.order_id = orders.id
        AND order_assignments.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "System can log activity"
ON feedback_room_activity FOR INSERT
WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_room_activity;

-- Create storage bucket for feedback room files
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-room-files', 'feedback-room-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (with unique names to avoid conflicts)
CREATE POLICY "feedback_room_upload_files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-room-files'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "feedback_room_view_files"
ON storage.objects FOR SELECT
USING (bucket_id = 'feedback-room-files');

CREATE POLICY "feedback_room_update_own_files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'feedback-room-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "feedback_room_delete_own_files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'feedback-room-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);