-- Fix profiles table public read access
-- Check if there's any policy making profiles publicly readable
SELECT policyname, tablename, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT';

-- The profiles table should only allow users to see their own data and staff to see all
-- Let's ensure no public access exists
-- Remove any overly permissive policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;