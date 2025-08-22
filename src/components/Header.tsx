import { Crown } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-8 h-8 bg-gradient-gold rounded-lg flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-casino-charcoal">
              The Casino @ Dania Beach
            </h1>
            <p className="text-xs text-muted-foreground">
              Your Complete Casino Guide
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};