import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AgeGate } from "@/components/AgeGate";
import { Header } from "@/components/Header";
import { Navigation, NavigationTab } from "@/components/Navigation";
import { Home } from "@/pages/Home";
import { Poker } from "@/pages/Poker";
import { Gaming } from "@/pages/Gaming";
import { Dining } from "@/pages/Dining";
import { Entertainment } from "@/pages/Entertainment";
import { Visit } from "@/pages/Visit";
import { Auth } from "@/pages/Auth";
import { Admin } from "@/pages/Admin";
import { WalletPage } from "@/pages/Wallet";

const queryClient = new QueryClient();

const MainApp = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>("home");

  // Handle URL-based navigation
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/poker') setActiveTab('poker');
    else if (path === '/gaming') setActiveTab('gaming');
    else if (path === '/dining') setActiveTab('dining');
    else if (path === '/entertainment') setActiveTab('entertainment');
    else if (path === '/visit') setActiveTab('visit');
    else setActiveTab('home');
  }, []);

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    const path = tab === 'home' ? '/' : `/${tab}`;
    window.history.pushState(null, '', path);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {renderTabContent()}
      </main>
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

const App = () => {
  const [ageVerified, setAgeVerified] = useState(false);

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
        <Router>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/poker" element={<MainApp />} />
            <Route path="/gaming" element={<MainApp />} />
            <Route path="/dining" element={<MainApp />} />
            <Route path="/entertainment" element={<MainApp />} />
            <Route path="/visit" element={<MainApp />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
