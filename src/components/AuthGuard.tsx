import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, LogIn } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'User' | 'Staff' | 'Admin';
  fallback?: React.ReactNode;
}

interface UserProfile {
  tier: 'User' | 'Staff' | 'Admin';
  name?: string;
}

interface UserRole {
  role: 'User' | 'Staff' | 'Admin';
}

export const AuthGuard = ({ 
  children, 
  requireAuth = false, 
  requireRole, 
  fallback 
}: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Staff' | 'User' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetch to prevent deadlocks
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // SECURITY FIX: Use only user_roles table for authorization
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role', { ascending: false }) // Admin > Staff > User
        .limit(1)
        .single();

      // Set role or default to 'User'
      const userRole = roleData?.role || 'User';
      setUserRole(userRole as 'Admin' | 'Staff' | 'User');
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('User'); // Default to User role on error
    } finally {
      setLoading(false);
    }
  };

  const DefaultAuthRequired = () => (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Authentication Required</CardTitle>
          <CardDescription>
            Please sign in to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const DefaultInsufficientRole = () => (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-casino-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Required role: {requireRole}
            <br />
            Your role: {userRole || 'Unknown'}
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return fallback || <DefaultAuthRequired />;
  }

  // Check role requirement
  if (requireRole && (!userRole || userRole !== requireRole)) {
    // Staff and Admin can access User areas
    if (requireRole === 'User' && userRole && (userRole === 'Staff' || userRole === 'Admin')) {
      return <>{children}</>;
    }
    // Admin can access Staff areas
    if (requireRole === 'Staff' && userRole && userRole === 'Admin') {
      return <>{children}</>;
    }
    // Otherwise, access denied
    return fallback || <DefaultInsufficientRole />;
  }

  return <>{children}</>;
};
