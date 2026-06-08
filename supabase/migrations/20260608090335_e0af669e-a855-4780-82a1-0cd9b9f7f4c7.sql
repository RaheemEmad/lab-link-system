
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Collaborators can view linked profiles" ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.order_assignments oa ON oa.order_id = o.id WHERE o.doctor_id = auth.uid() AND oa.user_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.orders o JOIN public.order_assignments oa ON oa.order_id = o.id WHERE oa.user_id = auth.uid() AND o.doctor_id = profiles.id)
);

DROP POLICY IF EXISTS "Anyone authenticated can view doctor verification" ON public.doctor_verification;
CREATE POLICY "Users can view own verification" ON public.doctor_verification FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Assigned labs can view linked doctor verification" ON public.doctor_verification FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.order_assignments oa ON oa.order_id = o.id WHERE o.doctor_id = doctor_verification.user_id AND oa.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can add reactions" ON public.feedback_room_reactions;
CREATE POLICY "Users can add reactions to accessible items" ON public.feedback_room_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND (
    (attachment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.feedback_room_attachments a JOIN public.orders o ON o.id = a.order_id
      WHERE a.id = feedback_room_reactions.attachment_id
        AND (o.doctor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()))
    ))
    OR (comment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.feedback_room_comments c JOIN public.orders o ON o.id = c.order_id
      WHERE c.id = feedback_room_reactions.comment_id
        AND (o.doctor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()))
    ))
  )
);

DROP POLICY IF EXISTS "Users can view notes for orders they can see" ON public.order_notes;
CREATE POLICY "Users can view notes for orders they can see" ON public.order_notes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o WHERE o.id = order_notes.order_id
  AND (o.doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid())))
));

DROP POLICY IF EXISTS "Users can create notes for orders they can access" ON public.order_notes;
CREATE POLICY "Users can create notes for orders they can access" ON public.order_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.orders o WHERE o.id = order_notes.order_id
  AND (o.doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid())))
));

DROP POLICY IF EXISTS "Users can view edit history for accessible orders" ON public.order_edit_history;
CREATE POLICY "Users can view edit history for accessible orders" ON public.order_edit_history FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o WHERE o.id = order_edit_history.order_id
  AND (o.doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid())))
));

DROP POLICY IF EXISTS "Users can view likes for accessible notes" ON public.note_likes;
CREATE POLICY "Users can view likes for accessible notes" ON public.note_likes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.order_notes n JOIN public.orders o ON o.id = n.order_id WHERE n.id = note_likes.note_id
  AND (o.doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid())))
));

DROP POLICY IF EXISTS "Users can like notes for orders they can access" ON public.note_likes;
CREATE POLICY "Users can like notes for orders they can access" ON public.note_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.order_notes n JOIN public.orders o ON o.id = n.order_id WHERE n.id = note_likes.note_id
  AND (o.doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'lab_staff'::app_role) AND EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid())))
));

DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view order attachments" ON storage.objects;

DROP POLICY IF EXISTS "feedback_room_view_files" ON storage.objects;
CREATE POLICY "feedback_room_view_files_scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'feedback-room-files' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.feedback_room_attachments a JOIN public.orders o ON o.id = a.order_id
      WHERE a.file_url LIKE '%' || name
        AND (o.doctor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.order_assignments oa WHERE oa.order_id = o.id AND oa.user_id = auth.uid()))
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Authorized users can view order screenshots" ON storage.objects;
CREATE POLICY "Authorized users can view order screenshots" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-screenshots' AND (
    EXISTS (SELECT 1 FROM public.orders o WHERE (o.id)::text = (storage.foldername(objects.name))[1] AND o.doctor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders o JOIN public.order_assignments oa ON oa.order_id = o.id
               WHERE (o.id)::text = (storage.foldername(objects.name))[1] AND oa.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
