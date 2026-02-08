import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortField = 'created_at' | 'final_total' | 'status' | 'payment_status';
export type SortDirection = 'asc' | 'desc';

interface InvoiceSortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

const sortFieldLabels: Record<SortField, string> = {
  created_at: 'Date Created',
  final_total: 'Amount',
  status: 'Status',
  payment_status: 'Payment Status',
};

const InvoiceSortControls = ({
  sortField,
  sortDirection,
  onSortChange,
}: InvoiceSortControlsProps) => {
  const handleFieldChange = (field: string) => {
    onSortChange(field as SortField, sortDirection);
  };

  const handleDirectionChange = (direction: string) => {
    onSortChange(sortField, direction as SortDirection);
  };

  const DirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Sort:</span> {sortFieldLabels[sortField]}
            <DirectionIcon className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortField} onValueChange={handleFieldChange}>
            <DropdownMenuRadioItem value="created_at">Date Created</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="final_total">Amount</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="payment_status">Payment Status</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortDirection} onValueChange={handleDirectionChange}>
            <DropdownMenuRadioItem value="desc">
              <ArrowDown className="h-3 w-3 mr-2" />
              Newest / Highest First
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">
              <ArrowUp className="h-3 w-3 mr-2" />
              Oldest / Lowest First
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default InvoiceSortControls;
