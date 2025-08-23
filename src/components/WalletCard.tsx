import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Share2 } from "lucide-react";

interface WalletItem {
  id: string;
  type: 'ticket' | 'poker_entry' | 'voucher' | 'order';
  title: string;
  subtitle?: string;
  amount?: number;
  status: string;
  barcode?: string;
  pickup_code?: string;
  issued_at: string;
  expires_at?: string;
}

interface WalletCardProps {
  item: WalletItem;
  onViewBarcode?: (item: WalletItem) => void;
  onAddToWallet?: (item: WalletItem) => void;
}

export const WalletCard = ({ item, onViewBarcode, onAddToWallet }: WalletCardProps) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500 text-white';
      case 'ready': return 'bg-blue-500 text-white';
      case 'redeemed': return 'bg-gray-500 text-white';
      case 'expired': return 'bg-red-500 text-white';
      default: return 'bg-yellow-500 text-black';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ticket': return '🎫';
      case 'poker_entry': return '♠️';
      case 'voucher': return '💰';
      case 'order': return '🍽️';
      default: return '📋';
    }
  };

  const isActive = ['paid', 'ready'].includes(item.status);
  const showBarcode = isActive && (item.barcode || item.pickup_code);

  return (
    <Card className={`shadow-elegant transition-all duration-300 ${isActive ? 'hover:shadow-gold' : 'opacity-75'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTypeIcon(item.type)}</div>
            <div>
              <CardTitle className="text-base font-bold text-casino-charcoal">
                {item.title}
              </CardTitle>
              {item.subtitle && (
                <CardDescription className="text-sm">
                  {item.subtitle}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge className={getStatusColor(item.status)}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount and Details */}
        <div className="space-y-2">
          {item.amount && (
            <div className="text-lg font-bold text-casino-charcoal">
              {formatPrice(item.amount)}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Issued: {formatDateTime(item.issued_at)}
          </div>
          {item.expires_at && (
            <div className="text-sm text-muted-foreground">
              Expires: {formatDateTime(item.expires_at)}
            </div>
          )}
        </div>

        {/* Pickup Code (for orders) */}
        {item.pickup_code && (
          <div className="bg-accent/20 p-3 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Pickup Code</div>
            <div className="text-2xl font-mono font-bold text-casino-charcoal tracking-wider">
              {item.pickup_code}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showBarcode && (
          <div className="flex space-x-2">
            {onViewBarcode && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewBarcode(item)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                View Code
              </Button>
            )}
            {onAddToWallet && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onAddToWallet(item)}
              >
                <Download className="h-4 w-4 mr-2" />
                Add to Wallet
              </Button>
            )}
          </div>
        )}

        {/* Barcode Display (when expanded) */}
        {item.barcode && (
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-primary/20 text-center">
            <div className="text-xs text-muted-foreground mb-2">Barcode</div>
            <div className="font-mono text-sm bg-black text-white p-2 rounded">
              {item.barcode}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Present this code at the cashier
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};