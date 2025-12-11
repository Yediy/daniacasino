import { supabase } from "@/integrations/supabase/client";

/**
 * Get the authenticated user's profile ID from the profiles table.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getUserIdFromAuth(): Promise<string | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  return user.id;
}

/**
 * Get the full user profile from the profiles table.
 * Returns null if not authenticated or profile doesn't exist.
 */
export async function getCurrentUserProfile() {
  const userId = await getUserIdFromAuth();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data;
}

/**
 * Check if current user has a specific role.
 */
export async function hasUserRole(role: 'Admin' | 'Staff' | 'User'): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: (await getUserIdFromAuth()) || '',
    _role: role
  });
  
  if (error) {
    console.error("Error checking user role:", error);
    return false;
  }
  
  return data === true;
}
