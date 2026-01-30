import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { type OrderStatus } from '@/types';

interface OrderActionsProps {
  selectedCount: number;
  onBulkStatusChange: (status: OrderStatus) => void;
  onBulkDelete: () => void;
  onExport: () => void;
  availableStatuses: OrderStatus[];
}

export const OrderActions = memo(({
  selectedCount,
  onBulkStatusChange,
  onBulkDelete,
  onExport,
  availableStatuses,
}: OrderActionsProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');

  const handleStatusChange = useCallback(
    (status: string) => {
      if (status) {
        onBulkStatusChange(status as OrderStatus);
        setSelectedStatus('');
      }
    },
    [onBulkStatusChange]
  );

  if (selectedCount === 0) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          Export
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
        <span className="text-sm font-medium">
          {selectedCount} order{selectedCount !== 1 ? 's' : ''} selected
        </span>

        <div className="flex gap-2">
          <Select value={selectedStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Change status..." />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
          >
            Export Selected
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} order{selectedCount !== 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

OrderActions.displayName = 'OrderActions';
