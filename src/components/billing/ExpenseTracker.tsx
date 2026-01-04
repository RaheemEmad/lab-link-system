import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Loader2, Receipt, Truck, Package, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExpenseTrackerProps {
  orderId: string;
  onClose: () => void;
}

interface Expense {
  id: string;
  order_id: string;
  invoice_id: string | null;
  expense_type: string;
  amount: number;
  description: string | null;
  incurred_at: string;
  recorded_by: string;
  receipt_url: string | null;
  created_at: string;
}

const ExpenseTracker = ({ orderId, onClose }: ExpenseTrackerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expenseType, setExpenseType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Fetch order details
  const { data: order } = useQuery({
    queryKey: ['order-for-expense', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, patient_name')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['logistics-expenses', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logistics_expenses')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!expenseType) throw new Error('Select expense type');
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error('Enter valid positive amount');
      }

      const numAmount = parseFloat(amount);

      // Get invoice if exists
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      // Insert expense
      const { error } = await supabase
        .from('logistics_expenses')
        .insert({
          order_id: orderId,
          invoice_id: invoice?.id || null,
          expense_type: expenseType,
          amount: numAmount,
          description: description || null,
          recorded_by: user.id,
        });

      if (error) throw error;

      // If invoice exists, update expenses total
      if (invoice?.id) {
        const { data: allExpenses } = await supabase
          .from('logistics_expenses')
          .select('amount')
          .eq('invoice_id', invoice.id);

        const totalExpenses = (allExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);

        const { data: inv } = await supabase
          .from('invoices')
          .select('subtotal, adjustments_total')
          .eq('id', invoice.id)
          .single();

        if (inv) {
          await supabase
            .from('invoices')
            .update({
              expenses_total: totalExpenses,
              final_total: inv.subtotal + inv.adjustments_total - totalExpenses,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

          // Add audit log
          await supabase.from('billing_audit_log').insert({
            invoice_id: invoice.id,
            action: 'expense_added',
            performed_by: user.id,
            new_values: { expense_type: expenseType, amount: numAmount },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistics-expenses', orderId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Expense recorded');
      setExpenseType('');
      setAmount('');
      setDescription('');
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to add expense', { description: error.message });
    },
  });

  const getExpenseIcon = (type: string) => {
    switch (type) {
      case 'delivery':
      case 're_delivery':
        return <Truck className="h-4 w-4" />;
      case 'courier':
        return <Package className="h-4 w-4" />;
      case 'packaging':
        return <Package className="h-4 w-4" />;
      case 'pickup':
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Logistics Expenses
              </CardTitle>
              <CardDescription>
                Order: {order?.order_number} • {order?.patient_name}
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Form */}
          {showAddForm && (
            <div className="p-4 mb-6 border rounded-lg bg-muted/30 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expense Type</Label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="re_delivery">Re-delivery</SelectItem>
                      <SelectItem value="courier">Courier</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Add details about this expense..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addExpenseMutation.mutate()}
                  disabled={addExpenseMutation.isPending || !expenseType || !amount}
                >
                  {addExpenseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Add Expense
                </Button>
              </div>
            </div>
          )}

          {/* Expenses List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No expenses recorded</p>
              <p className="text-sm">Track delivery, courier, and packaging costs</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {expenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        {getExpenseIcon(expense.expense_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {expense.expense_type.replace('_', '-')}
                          </Badge>
                          {expense.invoice_id && (
                            <Badge variant="secondary" className="text-xs">
                              Linked to Invoice
                            </Badge>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {expense.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(expense.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-lg text-destructive">
                      -${expense.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 rounded-lg border-2 border-dashed">
                <span className="font-medium">Total Expenses</span>
                <span className="font-bold text-xl text-destructive">
                  -${totalExpenses.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseTracker;