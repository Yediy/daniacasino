import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgeGate } from "@/components/AgeGate";
import { Header } from "@/components/Header";
import { Navigation, NavigationTab } from "@/components/Navigation";
import { Home } from "@/pages/Home";
import { Poker } from "@/pages/Poker";
import { Gaming } from "@/pages/Gaming";
import { Dining } from "@/pages/Dining";
import { Entertainment } from "@/pages/Entertainment";
import { Visit } from "@/pages/Visit";

const queryClient = new QueryClient();

const App = () => {
  const [ageVerified, setAgeVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<NavigationTab>("home");

  useEffect(() => {
    const verified = localStorage.getItem("age_verified");
    if (verified === "true") {
      setAgeVerified(true);
    }
  }, []);

  const handleAgeVerify = () => {
    localStorage.setItem("age_verified", "true");
    setAgeVerified(true);
  };

  const renderTabContent = () => {
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
      case "visit":
        return <Visit />;
      default:
        return <Home />;
    }
  };

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
          <Header />
          <main>
            {renderTabContent()}
          </main>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
