import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Scan, CheckCircle, XCircle, Ticket, Trophy, UtensilsCrossed, Gift } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";

interface RedemptionResult {
  success: boolean;
  voucher?: {
    id: string;
    amount: number;
    redeemed_at: string;
    chip_value: number;
  };
  error?: string;
}

export const VoucherRedemption = () => {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<RedemptionResult | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const { toast } = useToast();

  const getVoucherIcon = (type: string) => {
    switch (type) {
      case "CHIP": return Ticket;
      case "TOURNEY_ENTRY": return Trophy;
      case "FOOD": return UtensilsCrossed;
      case "PROMO": return Gift;
      default: return Scan;
    }
  };

  const handleRedeem = async () => {
    if (!barcode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a barcode",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('redeem-voucher', {
        body: { barcode: barcode.trim() }
      });

      if (error) throw error;

      setLastResult(data);

      if (data.success) {
        toast({
          title: "✅ Voucher Redeemed",
          description: `Successfully redeemed $${(data.voucher.amount / 100).toFixed(2)} voucher`,
        });
        setBarcode("");
      } else {
        toast({
          title: "Redemption Failed",
          description: data.error || "Unable to redeem voucher",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to redeem voucher";
      setLastResult({ success: false, error: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRedeem();
    }
  };

  const handleScan = (data: string) => {
    setBarcode(data);
    setScannerEnabled(false);
    // Auto-redeem after scan
    setTimeout(() => {
      handleRedeem();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2 mb-2">
            <Scan className="h-8 w-8 text-primary" />
            Voucher Redemption
          </h1>
          <p className="text-muted-foreground">
            Scan or enter voucher barcode to redeem
          </p>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="camera">Camera Scanner</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card className="shadow-elegant border-2">
              <CardHeader>
                <CardTitle>Enter Barcode</CardTitle>
                <CardDescription>
                  Type the voucher barcode or use a barcode scanner
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="VOUCHER-XXXX-XXXX-XXXX"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="font-mono text-lg"
                    autoFocus
                  />
                  <Button 
                    onClick={handleRedeem} 
                    disabled={loading || !barcode.trim()}
                    size="lg"
                  >
                    {loading ? "Processing..." : "Redeem"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Ticket className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-xs text-muted-foreground">Chip Vouchers</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Trophy className="h-6 w-6 mx-auto mb-2 text-warning" />
                    <div className="text-xs text-muted-foreground">Tournament Entry</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <UtensilsCrossed className="h-6 w-6 mx-auto mb-2 text-success" />
                    <div className="text-xs text-muted-foreground">Food Vouchers</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Gift className="h-6 w-6 mx-auto mb-2 text-destructive" />
                    <div className="text-xs text-muted-foreground">Promotions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="camera">
            <QrScanner 
              onScan={handleScan}
              onError={(error) => {
                toast({
                  title: "Scanner Error",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </TabsContent>
        </Tabs>

        {lastResult && (
          <Card className={lastResult.success ? "border-success shadow-elegant" : "border-destructive"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {lastResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />
                    Redemption Successful
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    Redemption Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastResult.success && lastResult.voucher ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Chip Value:</span>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      ${lastResult.voucher.chip_value.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Redeemed at {new Date(lastResult.voucher.redeemed_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-destructive">
                  {lastResult.error || "Unknown error occurred"}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Quick Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div>• Use a barcode scanner or manually enter the voucher code</div>
            <div>• Press Enter or click Redeem to process</div>
            <div>• Vouchers can only be redeemed within their valid time window</div>
            <div>• Each voucher can only be redeemed once</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
