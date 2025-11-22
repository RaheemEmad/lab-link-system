-- Add RLS policies to user_roles table to allow users to read their own roles
-- This fixes the "User role not found" error in onboarding-complete

-- Policy: Users can read their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own role (for onboarding)
CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);