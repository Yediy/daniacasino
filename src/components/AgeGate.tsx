import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users } from "lucide-react";

interface AgeGateProps {
  onVerify: () => void;
}

export const AgeGate = ({ onVerify }: AgeGateProps) => {
  const [slotsVerified, setSlotsVerified] = useState(false);
  const [pokerVerified, setPokerVerified] = useState(false);

  const canProceed = slotsVerified && pokerVerified;

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-casino-charcoal">
              Age Verification Required
            </CardTitle>
            <CardDescription className="text-casino-charcoal-light mt-2">
              The Casino @ Dania Beach
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="slots-age"
                checked={slotsVerified}
                onCheckedChange={(checked) => setSlotsVerified(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <label
                  htmlFor="slots-age"
                  className="text-sm font-medium text-casino-charcoal cursor-pointer"
                >
                  I am 21 years or older
                </label>
                <p className="text-xs text-muted-foreground">
                  Required for slots, electronic table games, and general casino access
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="poker-age"
                checked={pokerVerified}
                onCheckedChange={(checked) => setPokerVerified(checked as boolean)}
                className="mt-1"
              />
              <div className="space-y-1">
                <label
                  htmlFor="poker-age"
                  className="text-sm font-medium text-casino-charcoal cursor-pointer"
                >
                  I am 18 years or older
                </label>
                <p className="text-xs text-muted-foreground">
                  Required for poker room access
                </p>
              </div>
            </div>
          </div>

          <div className="bg-accent/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-casino-charcoal">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">Responsible Gaming</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This is a smoke-free casino. Play responsibly and within your limits.
            </p>
          </div>

          <Button
            onClick={onVerify}
            disabled={!canProceed}
            className="w-full bg-gradient-gold hover:bg-casino-gold-dark shadow-gold"
            size="lg"
          >
            Enter Casino
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};