-- FINAL FIX: Ensure profiles table is properly secured
-- The security scanner is still detecting public access to profiles

-- Remove any overly permissive policies on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Ensure the anonymous denial policy is the most restrictive
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
CREATE POLICY "Deny all anonymous access to profiles" ON public.profiles
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- Double-check authenticated user policies are restrictive enough
-- Users should only access their own profile
-- Staff and admins can view profiles for legitimate business purposes
-- All policies should require authentication