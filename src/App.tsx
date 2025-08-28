import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { AgeGate } from "@/components/AgeGate";
import { Auth } from "@/pages/Auth";
import { Admin } from "@/pages/Admin";
import { Tickets } from "@/pages/Tickets";
import { SlotsLive } from "@/pages/SlotsLive";
import { Header } from "@/components/Header";
import { Navigation, NavigationTab } from "@/components/Navigation";
import { Home } from "@/pages/Home";
import { Poker } from "@/pages/Poker";
import { Gaming } from "@/pages/Gaming";
import { GamingLive } from "@/pages/GamingLive";
import { PokerLive } from "@/pages/PokerLive";
import { KitchenDashboard } from "@/pages/KitchenDashboard";
import { StaffHeatmap } from "@/pages/StaffHeatmap";
import { DiningEnhanced } from "@/pages/DiningEnhanced";
import { Dining } from "@/pages/Dining";
import { Entertainment } from "@/pages/Entertainment";
import { Visit } from "@/pages/Visit";
import { JaiAlai } from "@/pages/JaiAlai";
import { WalletPage } from "@/pages/Wallet";

const queryClient = new QueryClient();

const App = () => {
  const [ageVerified, setAgeVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<NavigationTab>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Auto-create profile if user signs up
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            if (!profile) {
              await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  name: session.user.user_metadata?.name || null,
                  tier: 'User'
                });
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check age verification
    const verified = localStorage.getItem("age_verified");
    if (verified === "true") {
      setAgeVerified(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleAgeVerify = () => {
    localStorage.setItem("age_verified", "true");
    setAgeVerified(true);
  };

  const renderTabContent = () => {
    // Check for wallet access (requires auth)
    if (activeTab === "wallet") {
      if (!user) {
        return <Auth />;
      }
      return <WalletPage />;
    }

    // Check for admin access
    if (activeTab === "admin") {
      return <Admin />;
    }

    // Check for tickets access
    if (activeTab === "tickets") {
      return <Tickets />;
    }

    // Check for slots live access  
    if (activeTab === "slots") {
      return <SlotsLive />;
    }

    // Check for gaming live access
    if (activeTab === "gaming-live") {
      return <GamingLive />;
    }

    // Check for poker live access
    if (activeTab === "poker-live") {
      return <PokerLive />;
    }

    // Check for kitchen dashboard access
    if (activeTab === "kitchen") {
      return <KitchenDashboard />;
    }

    // Check for staff heatmap access
    if (activeTab === "staff-heatmap") {
      return <StaffHeatmap />;
    }

    // Check for enhanced dining access
    if (activeTab === "dining-enhanced") {
      return <DiningEnhanced />;
    }

    switch (activeTab) {
      case "home":
        return <Home />;
      case "poker":
        return <Poker />;
      case "gaming":
        return <Gaming />;
      case "dining":
        return <Dining />;
      case "entertainment":
        return <Entertainment />;
      case "jai-alai":
        return <JaiAlai />;
      case "visit":
        return <Visit />;
      default:
        return <Home />;
    }
  };

  if (loading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-lg">Loading...</div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!ageVerified) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AgeGate onVerify={handleAgeVerify} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background">
          <Header user={user} />
          <main>
            {renderTabContent()}
          </main>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} user={user} />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;