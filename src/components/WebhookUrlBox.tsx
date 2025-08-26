import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const WebhookUrlBox = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const webhookUrl = "https://lcfsuhdcexrbqevdojlw.supabase.co/functions/v1/stripe-webhook";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({
        description: "Webhook URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Failed to copy URL",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Stripe Webhook URL</CardTitle>
        <CardDescription>
          Copy this URL and paste it in your Stripe Dashboard → Webhooks section
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={webhookUrl} 
            readOnly 
            className="font-mono text-sm"
          />
          <Button 
            onClick={copyToClipboard}
            size="icon"
            variant="outline"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Make sure to select these events in Stripe:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>checkout.session.completed</li>
            <li>payment_intent.succeeded</li>
            <li>payment_intent.canceled</li>
            <li>charge.refunded</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookUrlBox;