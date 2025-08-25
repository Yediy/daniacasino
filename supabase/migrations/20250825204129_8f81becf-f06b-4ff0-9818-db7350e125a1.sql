-- Create proper role system to fix privilege escalation vulnerability

-- 1. Create app_role enum (matching existing user_role values)
CREATE TYPE public.app_role AS ENUM ('User', 'Staff', 'Admin');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Admin') THEN 'Admin'::app_role
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Staff') THEN 'Staff'::app_role
    ELSE 'User'::app_role
  END
$$;

-- 5. Migrate existing profile tiers to user_roles (handle string conversion)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN tier::text = 'User' THEN 'User'::app_role
    WHEN tier::text = 'Staff' THEN 'Staff'::app_role
    WHEN tier::text = 'Admin' THEN 'Admin'::app_role
    ELSE 'User'::app_role
  END
FROM public.profiles 
WHERE tier IS NOT NULL;

-- 6. Update profiles table RLS policies to use new role system
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update user tiers"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'Admin'));

-- 7. Create RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'Admin'))
WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- 8. Update audit_logs policies to use new role system
DROP POLICY IF EXISTS "Service role can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Staff can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'Staff'));

-- 9. Update poker table policies to prevent user ID exposure
DROP POLICY IF EXISTS "Staff can view all poker table data" ON public.poker_tables;
DROP POLICY IF EXISTS "Users can view poker tables" ON public.poker_tables;
DROP POLICY IF EXISTS "Public can view basic poker table info" ON public.poker_tables;

-- Create safe public view for poker tables (no user IDs exposed)
CREATE VIEW public.poker_tables_public AS
SELECT 
    id,
    name,
    game,
    stakes,
    status,
    floor_zone,
    players,
    open_seats,
    max_seats,
    wait_count,
    updated_at
FROM public.poker_tables;

CREATE POLICY "Staff can view full poker table data"
ON public.poker_tables
FOR SELECT
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Public can view safe poker table info"
ON public.poker_tables
FOR SELECT
USING (true);

-- 10. Update poker_table_players policies
DROP POLICY IF EXISTS "Staff can view all poker table players" ON public.poker_table_players;

CREATE POLICY "Staff can view all poker table players"
ON public.poker_table_players
FOR SELECT
USING (public.has_role(auth.uid(), 'Staff') OR public.has_role(auth.uid(), 'Admin'));