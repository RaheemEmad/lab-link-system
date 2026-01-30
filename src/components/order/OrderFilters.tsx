import { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { type OrderStatus } from '@/types';

interface OrderFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
  statuses: OrderStatus[];
}

export const OrderFilters = memo(({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  onRefresh,
  statuses,
}: OrderFiltersProps) => {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onStatusChange(value);
    },
    [onStatusChange]
  );

  return (
    <div className="flex gap-3 mb-6 flex-wrap items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, patient, or doctor..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      <div className="min-w-[180px]">
        <label className="text-sm font-medium mb-2 block">Status</label>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        title="Refresh orders"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>

      <Button variant="outline" size="sm">
        <Filter className="h-4 w-4 mr-2" />
        More Filters
      </Button>
    </div>
  );
});

OrderFilters.displayName = 'OrderFilters';
