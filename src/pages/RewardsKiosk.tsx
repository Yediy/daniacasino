import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/components/QrScanner";
import { Gift, CheckCircle2, XCircle, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RedemptionResult {
  success: boolean;
  reward_title?: string;
  voucher_id?: string;
  error?: string;
}

export default function RewardsKiosk() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<RedemptionResult | null>(null);
  const { toast } = useToast();

  const handleScan = async (barcode: string) => {
    setScanning(false);
    
    try {
      // Try to find the voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('chip_vouchers')
        .select(`
          *,
          rewards_redemptions (
            reward_id,
            rewards_catalog (
              title
            )
          )
        `)
        .eq('barcode', barcode)
        .single();

      if (voucherError || !voucher) {
        setLastResult({ success: false, error: 'Invalid barcode' });
        toast({
          title: "Invalid Barcode",
          description: "This barcode is not recognized",
          variant: "destructive",
        });
        return;
      }

      if (voucher.status === 'redeemed') {
        setLastResult({ success: false, error: 'Already redeemed' });
        toast({
          title: "Already Redeemed",
          description: "This reward has already been picked up",
          variant: "destructive",
        });
        return;
      }

      if (voucher.status !== 'paid') {
        setLastResult({ success: false, error: 'Not available for pickup' });
        toast({
          title: "Not Available",
          description: "This reward is not ready for pickup",
          variant: "destructive",
        });
        return;
      }

      // Get reward title from redemption
      const rewardTitle = voucher.rewards_redemptions?.[0]?.rewards_catalog?.title || 'Reward';

      // Mark as redeemed (self-service)
      const { error: updateError } = await supabase
        .from('chip_vouchers')
        .update({ 
          status: 'redeemed',
          redeemed_at: new Date().toISOString()
        })
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      setLastResult({ 
        success: true, 
        reward_title: rewardTitle,
        voucher_id: voucher.id 
      });

      toast({
        title: "Reward Redeemed!",
        description: `${rewardTitle} has been picked up successfully`,
      });
    } catch (error: any) {
      setLastResult({ success: false, error: error.message });
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Gift className="w-6 h-6" />
            Rewards Pickup Kiosk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg">Scan your reward barcode to pick up your item</p>
            <p className="text-sm text-muted-foreground">
              Hold your phone's barcode up to the camera
            </p>
          </div>

          {!scanning && !lastResult && (
            <Button
              onClick={() => setScanning(true)}
              size="lg"
              className="w-full h-24 text-xl"
            >
              <Scan className="w-8 h-8 mr-3" />
              Start Scanning
            </Button>
          )}

          {scanning && (
            <div className="space-y-4">
              <QrScanner
                onScan={handleScan}
                onError={(error) => {
                  toast({
                    title: "Scanner Error",
                    description: error,
                    variant: "destructive",
                  });
                  setScanning(false);
                }}
              />
              <Button
                onClick={() => setScanning(false)}
                variant="outline"
                className="w-full"
              >
                Cancel Scanning
              </Button>
            </div>
          )}

          {lastResult && (
            <div className="space-y-4">
              <div className={`p-6 rounded-lg border-2 ${
                lastResult.success 
                  ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                  : 'border-red-500 bg-red-50 dark:bg-red-950'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {lastResult.success ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                  <div className="text-2xl font-bold">
                    {lastResult.success ? 'Success!' : 'Failed'}
                  </div>
                </div>
                
                {lastResult.success ? (
                  <div className="space-y-2">
                    <p className="text-lg">{lastResult.reward_title}</p>
                    <Badge variant="outline">
                      ID: {lastResult.voucher_id?.slice(0, 8)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-3">
                      Please collect your reward from the counter
                    </p>
                  </div>
                ) : (
                  <p className="text-lg">{lastResult.error}</p>
                )}
              </div>

              <Button
                onClick={() => {
                  setLastResult(null);
                  setScanning(true);
                }}
                className="w-full"
              >
                Scan Another
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>Need help? Please visit the rewards desk</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
