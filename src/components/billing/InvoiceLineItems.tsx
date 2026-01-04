import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  Clock, 
  Zap, 
  AlertTriangle, 
  Award,
  RefreshCw,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LineItem {
  id: string;
  invoice_id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  source_event: string;
  source_record_id: string | null;
  rule_applied: string | null;
  created_at: string;
}

interface InvoiceLineItemsProps {
  invoiceId: string;
}

const InvoiceLineItems = ({ invoiceId }: InvoiceLineItemsProps) => {
  const { data: lineItems, isLoading } = useQuery({
    queryKey: ['invoice-line-items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as LineItem[];
    },
  });

  const getLineTypeIcon = (lineType: string) => {
    switch (lineType) {
      case 'base_price':
        return <DollarSign className="h-4 w-4" />;
      case 'urgency_fee':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'sla_penalty':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'sla_bonus':
        return <Award className="h-4 w-4 text-green-500" />;
      case 'rework':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'multi_unit':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getLineTypeBadgeVariant = (lineType: string) => {
    switch (lineType) {
      case 'base_price':
        return 'default';
      case 'urgency_fee':
        return 'outline';
      case 'sla_penalty':
        return 'destructive';
      case 'sla_bonus':
        return 'default';
      case 'rework':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSourceEventLabel = (sourceEvent: string) => {
    switch (sourceEvent) {
      case 'order_created':
        return 'Order Created';
      case 'lab_accepted':
        return 'Lab Accepted';
      case 'delivery_confirmed':
        return 'Delivery Confirmed';
      case 'feedback_approved':
        return 'Feedback Approved';
      case 'admin_override':
        return 'Admin Override';
      case 'rework_detected':
        return 'Rework Detected';
      case 'sla_calculation':
        return 'SLA Calculation';
      default:
        return sourceEvent;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lineItems || lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No line items yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Line Items Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div 
              key={item.id} 
              className={`p-4 rounded-lg border ${
                item.total_price < 0 
                  ? 'bg-destructive/5 border-destructive/20' 
                  : item.line_type === 'sla_bonus' 
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/20'
                    : 'bg-muted/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getLineTypeIcon(item.line_type)}
                    <span className="font-medium">{item.description}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={getLineTypeBadgeVariant(item.line_type) as any}>
                      {item.line_type.replace('_', ' ')}
                    </Badge>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="cursor-help">
                            <Info className="h-3 w-3 mr-1" />
                            {getSourceEventLabel(item.source_event)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Source event that triggered this line item</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {item.rule_applied && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground cursor-help">
                              Rule: {item.rule_applied}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pricing rule that calculated this amount</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-3">
                    {item.quantity > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </span>
                    )}
                    <span className={`font-semibold text-lg ${
                      item.total_price < 0 
                        ? 'text-destructive' 
                        : item.line_type === 'sla_bonus' 
                          ? 'text-green-600 dark:text-green-400'
                          : ''
                    }`}>
                      {item.total_price >= 0 ? '' : '-'}${Math.abs(item.total_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Line Items Total</span>
            <span className="font-bold text-xl">
              ${lineItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceLineItems;