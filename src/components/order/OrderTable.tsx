import { memo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type OrderStatus } from '@/types';

interface Order {
  id: string;
  order_number: string;
  doctor_name: string;
  patient_name: string;
  restoration_type: string;
  urgency: string;
  status: OrderStatus;
  timestamp: string;
  delivery_pending_confirmation?: boolean;
}

interface OrderTableProps {
  orders: Order[];
  selectedOrders: Set<string>;
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onViewDetails: (order: Order) => void;
  statusColors: Record<string, string>;
}

const statusColorMap = (status: OrderStatus, isPending?: boolean): string => {
  if (isPending && status === 'Ready for Delivery') {
    return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  }
  return '';
};

const OrderTableRow = memo(
  ({
    order,
    isSelected,
    onSelectChange,
    onEdit,
    onDelete,
    onViewDetails,
    statusColors,
  }: {
    order: Order;
    isSelected: boolean;
    onSelectChange: (selected: boolean) => void;
    onEdit: (order: Order) => void;
    onDelete: (orderId: string) => void;
    onViewDetails: (order: Order) => void;
    statusColors: Record<string, string>;
  }) => {
    const displayStatus = order.delivery_pending_confirmation && order.status === 'Ready for Delivery'
      ? 'Awaiting Confirmation'
      : order.status;

    return (
      <TableRow>
        <TableCell>
          <Checkbox checked={isSelected} onCheckedChange={onSelectChange} />
        </TableCell>
        <TableCell className="font-medium">{order.order_number}</TableCell>
        <TableCell>{order.patient_name}</TableCell>
        <TableCell>{order.doctor_name}</TableCell>
        <TableCell>{order.restoration_type}</TableCell>
        <TableCell>
          <Badge variant="outline" className={statusColors[displayStatus]}>
            {displayStatus}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={order.urgency === 'Urgent' ? 'destructive' : 'secondary'}>
            {order.urgency}
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-muted rounded">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(order)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(order)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(order.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  }
);

OrderTableRow.displayName = 'OrderTableRow';

export const OrderTable = memo(({
  orders,
  selectedOrders,
  onSelectOrder,
  onSelectAll,
  onEdit,
  onDelete,
  onViewDetails,
  statusColors,
}: OrderTableProps) => {
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      onSelectAll(checked);
    },
    [onSelectAll]
  );

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedOrders.size === orders.length && orders.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => (
            <OrderTableRow
              key={order.id}
              order={order}
              isSelected={selectedOrders.has(order.id)}
              onSelectChange={checked => onSelectOrder(order.id, checked as boolean)}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              statusColors={statusColors}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

OrderTable.displayName = 'OrderTable';
