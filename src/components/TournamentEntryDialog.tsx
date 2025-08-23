import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe("pk_test_51QTQe7P0RGF1B7sV1VsX1NnN1x5L0H5d0x1I1x5f1x5f1x5f1x5f1x5f1x5f1x");

interface Tournament {
  id: string;
  name: string;
  tournament_date: string;
  tournament_time: string;
  buyin: number;
  fee: number;
  seats_total: number;
  seats_left: number;
  description?: string;
  late_reg_until?: string;
}

interface TournamentEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament | null;
  onSuccess: () => void;
}

export const TournamentEntryDialog = ({ open, onOpenChange, tournament, onSuccess }: TournamentEntryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleBuyIn = async () => {
    if (!tournament) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to register for tournaments",
          variant: "destructive",
        });
        return;
      }

      // Calculate total amount
      const amountCents = tournament.buyin + tournament.fee;

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          purpose: 'tourney',
          refId: tournament.id,
          amountCents,
          description: `Tournament entry: ${tournament.name}`
        }
      });

      if (error) throw error;

      // Initialize Stripe checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId || data.clientSecret
      });

      if (stripeError) {
        throw stripeError;
      }

      // Success - show notification and navigate to poker entries
      toast({
        title: "Registration Successful",
        description: "You're now registered for the tournament!",
      });
      
      onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error registering for tournament:', error);
      toast({
        title: "Registration Error", 
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!tournament) return null;

  const total = tournament.buyin + tournament.fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Tournament Buy-In
          </DialogTitle>
          <DialogDescription>
            Register for {tournament.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Info */}
          <div className="bg-accent/20 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-casino-charcoal">{tournament.name}</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatDate(tournament.tournament_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{formatTime(tournament.tournament_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{tournament.seats_left} seats left</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {tournament.seats_left}/{tournament.seats_total}
                </Badge>
              </div>
            </div>

            {tournament.description && (
              <p className="text-sm text-muted-foreground">
                {tournament.description}
              </p>
            )}

            {tournament.late_reg_until && (
              <Badge variant="outline" className="text-xs">
                Late reg until {formatTime(tournament.late_reg_until)}
              </Badge>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-subtle p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Buy-in</span>
              <span>{formatPrice(tournament.buyin)}</span>
            </div>
            {tournament.fee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Fee</span>
                <span>{formatPrice(tournament.fee)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-casino-gold">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuyIn}
              className="flex-1 bg-gradient-gold hover:bg-casino-gold-dark"
              disabled={loading || tournament.seats_left <= 0}
            >
              {loading ? "Processing..." : tournament.seats_left <= 0 ? "Sold Out" : `Buy-In ${formatPrice(total)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};