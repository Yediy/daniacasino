import { useState } from "react";
import { Home, Spade, Gamepad2, Utensils, Calendar, MapPin, Wallet, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";

export type NavigationTab = "home" | "poker" | "gaming" | "dining" | "entertainment" | "jai-alai" | "visit" | "wallet" | "admin" | "tickets" | "slots" | "gaming-live" | "poker-live" | "kitchen" | "staff-heatmap" | "dining-enhanced" | "voucher-redemption" | "slots-heatmap" | "poker-seats" | "staff-orders" | "analytics" | "reports" | "player-dashboard" | "tournament-management" | "table-management" | "rewards" | "support";

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  user?: User | null;
}

export const Navigation = ({ activeTab, onTabChange, user }: NavigationProps) => {
  const baseTabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "tickets" as const, label: "Tickets", icon: Calendar },
    { id: "poker-live" as const, label: "Poker", icon: Spade },
    { id: "gaming-live" as const, label: "Gaming", icon: Gamepad2 },
    { id: "dining-enhanced" as const, label: "Dining", icon: Utensils },
    { id: "jai-alai" as const, label: "Jai-Alai", icon: Zap },
    { id: "visit" as const, label: "Visit", icon: MapPin },
  ];

  // Add authenticated user tabs
  const userTabs = user ? [
    { id: "wallet" as const, label: "Wallet", icon: Wallet }
  ] : [];

  // Add admin tab for staff/admin users (would need profile check in real implementation)
  const adminTabs: Array<{id: NavigationTab, label: string, icon: any}> = [];

  const tabs = [...baseTabs, ...userTabs, ...adminTabs];
  const handleTabClick = (tabId: NavigationTab) => {
    if (tabId === 'wallet' && !user) {
      window.location.href = '/auth';
      return;
    }
    onTabChange(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elegant z-50">
      <div className="flex justify-between items-center max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 relative flex-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1",
                isActive && "text-primary"
              )} />
              <span className="text-xs font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};