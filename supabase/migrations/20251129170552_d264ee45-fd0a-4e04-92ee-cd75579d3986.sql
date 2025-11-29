-- Drop the overly permissive RLS policy that exposes all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;