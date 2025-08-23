import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ticket, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe("pk_test_51QTQe7P0RGF1B7sV1VsX1NnN1x5L0H5d0x1I1x5f1x5f1x5f1x5f1x5f1x5f1x");

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  venue: string;
  price: number;
  fee: number;
  inventory: number;
}

interface TicketPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onSuccess: () => void;
}

export const TicketPurchaseDialog = ({ open, onOpenChange, event, onSuccess }: TicketPurchaseDialogProps) => {
  const [quantity, setQuantity] = useState(2);
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

  const handleQuantityChange = (change: number) => {
    const newQty = quantity + change;
    if (newQty >= 1 && newQty <= (event?.inventory || 0)) {
      setQuantity(newQty);
    }
  };

  const handlePurchase = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase tickets",
          variant: "destructive",
        });
        return;
      }

      // Calculate total amount
      const amountCents = (event.price + event.fee) * quantity;

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          purpose: 'event',
          refId: event.id,
          amountCents,
          qty: quantity,
          description: `${quantity} ticket${quantity > 1 ? 's' : ''} for ${event.title}`
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

      // Success handled by redirect
      onSuccess();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const subtotal = event.price * quantity;
  const fees = event.fee * quantity;
  const total = subtotal + fees;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Buy Tickets
          </DialogTitle>
          <DialogDescription>
            Purchase tickets for {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div className="bg-accent/20 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-casino-charcoal">{event.title}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{formatDate(event.event_date)} at {formatTime(event.event_time)}</p>
              <p>{event.venue}</p>
              <Badge variant="secondary" className="text-xs">
                {event.inventory} tickets available
              </Badge>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-3">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= event.inventory) {
                    setQuantity(val);
                  }
                }}
                className="text-center w-20"
                min="1"
                max={event.inventory}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= event.inventory}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-subtle p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tickets ({quantity}×)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {fees > 0 && (
              <div className="flex justify-between text-sm">
                <span>Fees</span>
                <span>{formatPrice(fees)}</span>
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
              onClick={handlePurchase}
              className="flex-1 bg-gradient-gold hover:bg-casino-gold-dark"
              disabled={loading}
            >
              {loading ? "Processing..." : `Pay ${formatPrice(total)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};