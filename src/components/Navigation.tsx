import { useState } from "react";
import { Home, Spade, Gamepad2, Utensils, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavigationTab = "home" | "poker" | "gaming" | "dining" | "entertainment" | "visit";

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const tabs = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "poker" as const, label: "Poker", icon: Spade },
  { id: "gaming" as const, label: "Gaming", icon: Gamepad2 },
  { id: "dining" as const, label: "Dining", icon: Utensils },
  { id: "entertainment" as const, label: "Events", icon: Calendar },
  { id: "visit" as const, label: "Visit", icon: MapPin },
];

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elegant z-50">
      <div className="grid grid-cols-6 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-casino-charcoal"
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