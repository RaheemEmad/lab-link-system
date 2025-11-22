-- Add foreign key relationship for order_status_history.changed_by -> profiles.id
ALTER TABLE public.order_status_history
ADD CONSTRAINT fk_changed_by_profile 
FOREIGN KEY (changed_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;