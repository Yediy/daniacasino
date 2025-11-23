import { Home, Ticket, Spade, UtensilsCrossed, Gamepad2, Wallet, User } from "lucide-react";
import { NavigationTab } from "./Navigation";

interface MobileNavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const MobileNavigation = ({ activeTab, onTabChange }: MobileNavigationProps) => {
  const tabs = [
    { id: "home" as NavigationTab, label: "Home", icon: Home },
    { id: "tickets" as NavigationTab, label: "Tickets", icon: Ticket },
    { id: "poker" as NavigationTab, label: "Poker", icon: Spade },
    { id: "dining" as NavigationTab, label: "Dining", icon: UtensilsCrossed },
    { id: "gaming" as NavigationTab, label: "Gaming", icon: Gamepad2 },
    { id: "wallet" as NavigationTab, label: "Wallet", icon: Wallet },
    { id: "player-dashboard" as NavigationTab, label: "Account", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
