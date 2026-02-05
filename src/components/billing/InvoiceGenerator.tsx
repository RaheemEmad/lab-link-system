import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Receipt, 
  CalendarIcon, 
  CheckCircle2, 
  Loader2,
  FileText,
  ArrowLeft,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceGeneratorProps {
  onClose: () => void;
  onGenerated: () => void;
}

interface EligibleOrder {
  id: string;
  order_number: string;
  patient_name: string;
  doctor_name: string;
  restoration_type: string;
  teeth_number: string;
  price: number | null;
  delivery_confirmed_at: string;
}

// Helper to count teeth from FDI notation
const countTeeth = (teethNumber: string): number => {
  if (!teethNumber) return 0;
  return teethNumber.split(',').filter(t => t.trim()).length;
};

// Helper to format EGP
const formatEGP = (amount: number) => {
  return `EGP ${amount.toLocaleString('en-EG', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

const InvoiceGenerator = ({ onClose, onGenerated }: InvoiceGeneratorProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch eligible orders
  const { data: eligibleOrders, isLoading } = useQuery({
    queryKey: ['eligible-orders-for-generator'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          patient_name, 
          doctor_name,
          restoration_type,
          teeth_number,
          price,
          delivery_confirmed_at
        `)
        .eq('status', 'Delivered')
        .not('delivery_confirmed_at', 'is', null)
        .order('delivery_confirmed_at', { ascending: false });

      if (error) throw error;

      // Filter out orders that already have invoices
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('order_id');

      const existingOrderIds = new Set((existingInvoices || []).map(i => i.order_id));
      return ((data || []) as EligibleOrder[]).filter(o => !existingOrderIds.has(o.id));
    },
    enabled: !!user
  });

  // Filter orders based on date and search
  const filteredOrders = useMemo(() => {
    if (!eligibleOrders) return [];
    
    let filtered = eligibleOrders;

    // Apply date filter
    if (dateFilter === 'week') {
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      filtered = filtered.filter(o => 
        isWithinInterval(new Date(o.delivery_confirmed_at), { start: weekStart, end: weekEnd })
      );
    } else if (dateFilter === 'month') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      filtered = filtered.filter(o => 
        isWithinInterval(new Date(o.delivery_confirmed_at), { start: monthStart, end: monthEnd })
      );
    } else if (dateFilter === 'custom' && dateRange.from && dateRange.to) {
      filtered = filtered.filter(o => 
        isWithinInterval(new Date(o.delivery_confirmed_at), { start: dateRange.from!, end: dateRange.to! })
      );
    }

    // Apply search filter
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.order_number.toLowerCase().includes(lowerSearch) ||
        o.patient_name.toLowerCase().includes(lowerSearch) ||
        o.doctor_name.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [eligibleOrders, dateFilter, dateRange, searchQuery]);

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
  };

  const clearSelection = () => {
    setSelectedOrders(new Set());
  };

  // Calculate totals for selected orders
  const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
  const totalCrowns = selectedOrdersList.reduce((sum, o) => sum + countTeeth(o.teeth_number), 0);
  const totalRevenue = selectedOrdersList.reduce((sum, o) => sum + (o.price || 0), 0);

  // Generate invoices mutation
  const handleGenerateInvoices = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate individual invoices for each order
      const orderIds = Array.from(selectedOrders);
      
      for (const orderId of orderIds) {
        const { error } = await supabase.rpc('generate_invoice_for_order', {
          p_order_id: orderId,
          p_user_id: user?.id
        });
        
        if (error) {
          console.error(`Failed to generate invoice for ${orderId}:`, error);
          throw error;
        }
      }

      toast.success(`Generated ${orderIds.length} invoice(s) successfully`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-orders-for-billing'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-orders-for-generator'] });
      onGenerated();
      onClose();
    } catch (error: any) {
      toast.error('Failed to generate invoices', { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Generate Invoices
            </CardTitle>
            <CardDescription>
              Select orders to generate invoices
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dateRange.from ? format(dateRange.from, 'MMM d') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {dateRange.to ? format(dateRange.to, 'MMM d') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} order(s) available
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs">
                Clear
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Order List */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="font-medium">No eligible orders</p>
            <p className="text-sm text-center">
              {eligibleOrders?.length === 0 
                ? "No delivered orders are awaiting invoices. Orders must be delivered and have their delivery confirmed before invoicing."
                : searchQuery 
                  ? `No orders match "${searchQuery}". Try a different search term.`
                  : "No orders match the current date filter. Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-2 px-2">
            <div className="space-y-2">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => toggleOrder(order.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedOrders.has(order.id)
                      ? "bg-primary/5 border-primary"
                      : "bg-background hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={selectedOrders.has(order.id)}
                    onCheckedChange={() => toggleOrder(order.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{order.order_number}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {countTeeth(order.teeth_number)} crowns
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.patient_name} • {order.restoration_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Delivered: {format(new Date(order.delivery_confirmed_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {order.price ? formatEGP(order.price) : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Summary Footer */}
      <CardFooter className="flex-col gap-3 border-t pt-4">
        <div className="w-full grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{selectedOrders.size}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCrowns}</p>
            <p className="text-xs text-muted-foreground">Crowns</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{formatEGP(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={selectedOrders.size === 0 || isGenerating}
          onClick={handleGenerateInvoices}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Generate {selectedOrders.size} Invoice{selectedOrders.size !== 1 ? 's' : ''}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InvoiceGenerator;
