-- Create lab_photos table for lab gallery images
CREATE TABLE IF NOT EXISTS public.lab_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lab_reviews table for dentist reviews
CREATE TABLE IF NOT EXISTS public.lab_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lab_id, dentist_id, order_id)
);

-- Enable RLS on lab_photos
ALTER TABLE public.lab_photos ENABLE ROW LEVEL SECURITY;

-- Everyone can view lab photos
CREATE POLICY "Everyone can view lab photos"
ON public.lab_photos
FOR SELECT
USING (true);

-- Admins and lab staff can manage their lab's photos
CREATE POLICY "Lab staff can manage their lab photos"
ON public.lab_photos
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND lab_id = lab_photos.lab_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'lab_staff'::app_role
    AND lab_id = lab_photos.lab_id
  )
);

-- Enable RLS on lab_reviews
ALTER TABLE public.lab_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Everyone can view lab reviews"
ON public.lab_reviews
FOR SELECT
USING (true);

-- Dentists can create reviews for labs they've worked with
CREATE POLICY "Dentists can create reviews"
ON public.lab_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = dentist_id AND
  has_role(auth.uid(), 'doctor'::app_role)
);

-- Dentists can update their own reviews
CREATE POLICY "Dentists can update their own reviews"
ON public.lab_reviews
FOR UPDATE
USING (auth.uid() = dentist_id)
WITH CHECK (auth.uid() = dentist_id);

-- Dentists can delete their own reviews
CREATE POLICY "Dentists can delete their own reviews"
ON public.lab_reviews
FOR DELETE
USING (auth.uid() = dentist_id);

-- Create indexes for better performance
CREATE INDEX idx_lab_photos_lab_id ON public.lab_photos(lab_id);
CREATE INDEX idx_lab_reviews_lab_id ON public.lab_reviews(lab_id);
CREATE INDEX idx_lab_reviews_dentist_id ON public.lab_reviews(dentist_id);
CREATE INDEX idx_lab_reviews_rating ON public.lab_reviews(rating);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_lab_photos_updated_at
BEFORE UPDATE ON public.lab_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_lab_reviews_updated_at
BEFORE UPDATE ON public.lab_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();