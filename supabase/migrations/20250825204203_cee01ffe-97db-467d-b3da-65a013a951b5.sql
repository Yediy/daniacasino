-- Fix security warnings from linter

-- 1. Fix function search paths for security (prevents SQL injection via search_path manipulation)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Admin') THEN 'Admin'::app_role
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Staff') THEN 'Staff'::app_role
    ELSE 'User'::app_role
  END
$$;

-- 2. Remove the problematic view and replace with a safer approach
DROP VIEW IF EXISTS public.poker_tables_public;

-- Instead, create a function that returns safe poker table data
CREATE OR REPLACE FUNCTION public.get_public_poker_tables()
RETURNS TABLE (
    id text,
    name text,
    game text,
    stakes text,
    status text,
    floor_zone text,
    players integer,
    open_seats integer,
    max_seats integer,
    wait_count integer,
    updated_at timestamp with time zone
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.game,
    p.stakes,
    p.status,
    p.floor_zone,
    p.players,
    p.open_seats,
    p.max_seats,
    p.wait_count,
    p.updated_at
  FROM public.poker_tables p
$$;