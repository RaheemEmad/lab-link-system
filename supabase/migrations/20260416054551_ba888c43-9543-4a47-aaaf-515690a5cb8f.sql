-- Allow authenticated users to read basic profile info for marketplace/order display
-- This is needed so lab staff can see doctor names on marketplace order cards
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop the old restrictive policies that are now redundant
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
