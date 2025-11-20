-- Remove legacy role column from profiles table
-- This column is no longer used since roles were moved to user_roles table

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop the unused user_role enum type
DROP TYPE IF EXISTS public.user_role CASCADE;