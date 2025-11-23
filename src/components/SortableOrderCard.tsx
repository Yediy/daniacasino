import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, GripVertical } from 'lucide-react';

interface Order {
  id: string;
  pickup_code: string;
  total: number;
  status: string;
  pickup_eta?: string;
  placed_at: string;
  dest_table?: string;
  dest_seat?: string;
}

interface OrderItem {
  id: string;
  menu_item_id: string;
  qty: number;
  notes?: string;
}

interface SortableOrderCardProps {
  order: Order;
  items: OrderItem[];
  onUpdateStatus: (orderId: string, status: string) => void;
  isDragging?: boolean;
}

export const SortableOrderCard = ({ order, items, onUpdateStatus, isDragging = false }: SortableOrderCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging || isDragging ? 0.5 : 1,
  };

  const getNextStatus = () => {
    switch (order.status) {
      case 'placed': return 'prepping';
      case 'prepping': return 'ready';
      case 'ready': return 'picked_up';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`shadow-elegant cursor-move hover:shadow-lg transition-all ${
        isDragging || isSortableDragging ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-mono">
              {order.pickup_code || '—'}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="capitalize">
            {order.status}
          </Badge>
        </div>
        <CardDescription>
          ${(order.total / 100).toFixed(2)} • {new Date(order.placed_at).toLocaleTimeString()}
        </CardDescription>
        
        {(order.dest_table || order.dest_seat) && (
          <div className="text-sm text-muted-foreground">
            📍 Table {order.dest_table || '—'} Seat {order.dest_seat || '—'}
          </div>
        )}
        
        {order.pickup_eta && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            ETA: {new Date(order.pickup_eta).toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Order Items */}
        {items.length > 0 && (
          <div className="border-t border-dashed pt-3 space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.qty}× Item</span>
                {item.notes && <span className="text-muted-foreground text-xs">{item.notes}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        {nextStatus && (
          <Button
            className="w-full"
            variant={nextStatus === 'ready' ? 'default' : 'outline'}
            onClick={() => onUpdateStatus(order.id, nextStatus)}
          >
            Mark as {nextStatus.replace('_', ' ')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
