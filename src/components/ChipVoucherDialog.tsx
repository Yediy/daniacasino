import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe("pk_test_51QTQe7P0RGF1B7sV1VsX1NnN1x5L0H5d0x1I1x5f1x5f1x5f1x5f1x5f1x5f1x");

interface Settings {
  min_chip_voucher: number;
  max_chip_voucher: number;
}

interface ChipVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ChipVoucherDialog = ({ open, onOpenChange, onSuccess }: ChipVoucherDialogProps) => {
  const [amount, setAmount] = useState(5000); // Default $50
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('min_chip_voucher, max_chip_voucher')
        .eq('id', 'global')
        .single();

      if (error) throw error;
      setSettings(data);
      
      // Set default amount to minimum
      if (data.min_chip_voucher) {
        setAmount(data.min_chip_voucher);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleAmountChange = (change: number) => {
    const newAmount = amount + change;
    const min = settings?.min_chip_voucher || 2000;
    const max = settings?.max_chip_voucher || 100000;
    
    if (newAmount >= min && newAmount <= max) {
      setAmount(newAmount);
    }
  };

  const calculateFee = (amount: number) => {
    // 3% processing fee, minimum $1
    return Math.max(100, Math.round(amount * 0.03));
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase chip vouchers",
          variant: "destructive",
        });
        return;
      }

      const fee = calculateFee(amount);
      const totalCents = amount + fee;

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          purpose: 'voucher',
          refId: null, // Backend will create voucher record
          amountCents: totalCents,
          fee,
          description: `Chip voucher for ${formatPrice(amount)}`
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
      console.error('Error purchasing voucher:', error);
      toast({
        title: "Purchase Error",
        description: "Failed to process purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return null;

  const fee = calculateFee(amount);
  const total = amount + fee;
  const min = settings.min_chip_voucher;
  const max = settings.max_chip_voucher;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Buy Chip Voucher
          </DialogTitle>
          <DialogDescription>
            Purchase casino chips for gaming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-3">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAmountChange(-1000)}
                disabled={amount <= min}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="amount"
                type="number"
                value={amount / 100}
                onChange={(e) => {
                  const val = Math.round(parseFloat(e.target.value) * 100);
                  if (val >= min && val <= max) {
                    setAmount(val);
                  }
                }}
                className="text-center"
                min={min / 100}
                max={max / 100}
                step="10"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAmountChange(1000)}
                disabled={amount >= max}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {formatPrice(min)}</span>
              <span>Max: {formatPrice(max)}</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[2500, 5000, 10000].map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                onClick={() => setAmount(amt)}
                className={amount === amt ? "bg-accent" : ""}
              >
                {formatPrice(amt)}
              </Button>
            ))}
          </div>

          {/* Voucher Info */}
          <div className="bg-accent/20 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                2-hour redemption window
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Redeem at any cashier within 2 hours of purchase. Present barcode for instant chip conversion.
            </p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-subtle p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Chip Value</span>
              <span>{formatPrice(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Processing Fee (3%)</span>
              <span>{formatPrice(fee)}</span>
            </div>
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
              {loading ? "Processing..." : `Purchase ${formatPrice(total)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};