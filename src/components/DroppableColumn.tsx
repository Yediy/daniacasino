import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableOrderCard } from './SortableOrderCard';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Order {
  id: string;
  pickup_code: string;
  total: number;
  status: string;
  pickup_eta?: string;
  placed_at: string;
  dest_table?: string;
  dest_seat?: string;
  vendor_id: string;
  user_id: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  notes?: string;
}

interface DroppableColumnProps {
  id: string;
  title: string;
  orders: Order[];
  orderItems: Record<string, OrderItem[]>;
  onUpdateStatus: (orderId: string, status: string) => void;
}

export const DroppableColumn = ({ id, title, orders, orderItems, onUpdateStatus }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-4 p-4 rounded-lg border-2 border-dashed transition-all min-h-[400px] ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary">{orders.length}</Badge>
      </div>

      <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {orders.map(order => (
            <SortableOrderCard
              key={order.id}
              order={order}
              items={orderItems[order.id] || []}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      </SortableContext>

      {orders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Drop orders here
        </div>
      )}
    </div>
  );
};
