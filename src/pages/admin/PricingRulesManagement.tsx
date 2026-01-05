import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Plus, 
  Pencil, 
  Loader2, 
  History,
  Zap,
  Clock,
  AlertTriangle,
  Award
} from "lucide-react";
import { toast } from "sonner";
import PricingRuleDialog from "@/components/admin/PricingRuleDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  restoration_type: string | null;
  urgency_level: string | null;
  condition: any;
  amount: number;
  is_percentage: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  rule_id: string;
  action: string;
  old_values: any;
  new_values: any;
  changed_by: string | null;
  created_at: string;
}

const PricingRulesManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch pricing rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as PricingRule[];
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['pricing-rules-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: showHistory,
  });

  // Toggle rule active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      // Get current rule data for audit
      const { data: currentRule } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      // Update rule
      const { error } = await supabase
        .from('pricing_rules')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', ruleId);
      if (error) throw error;

      // Log audit
      await supabase.from('pricing_rules_audit').insert({
        rule_id: ruleId,
        action: isActive ? 'activated' : 'deactivated',
        old_values: currentRule,
        new_values: { ...currentRule, is_active: isActive },
        changed_by: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-rules-audit'] });
      toast.success('Rule status updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update rule', { description: error.message });
    }
  });

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'base_price':
        return <DollarSign className="h-4 w-4" />;
      case 'multiplier':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'penalty':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'bonus':
        return <Award className="h-4 w-4 text-green-500" />;
      case 'flat_fee':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatAmount = (rule: PricingRule) => {
    if (rule.is_percentage) {
      return `${rule.amount}%`;
    }
    return `$${rule.amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground">
            Configure base prices, urgency fees, and SLA penalties
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Active Pricing Rules
          </CardTitle>
          <CardDescription>
            Rules are applied in priority order (lower number = higher priority)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No pricing rules configured</p>
              <p className="text-sm">Add rules to automate invoice calculations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Active</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ ruleId: rule.id, isActive: checked })
                        }
                        disabled={toggleActiveMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRuleTypeIcon(rule.rule_type)}
                        {rule.rule_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rule.rule_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {rule.restoration_type && (
                          <Badge variant="secondary" className="text-xs">
                            {rule.restoration_type}
                          </Badge>
                        )}
                        {rule.urgency_level && (
                          <Badge variant={rule.urgency_level === 'Urgent' ? 'destructive' : 'secondary'} className="text-xs">
                            {rule.urgency_level}
                          </Badge>
                        )}
                        {!rule.restoration_type && !rule.urgency_level && (
                          <span className="text-xs text-muted-foreground">All orders</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(rule)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rule.priority}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit History */}
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  <CardTitle className="text-lg">Change History</CardTitle>
                </div>
                <Badge variant="outline">
                  {showHistory ? 'Hide' : 'Show'}
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {!auditLog || auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No changes recorded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Badge variant={
                        entry.action === 'created' ? 'default' :
                        entry.action === 'deleted' ? 'destructive' :
                        'secondary'
                      }>
                        {entry.action}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entry.new_values?.rule_name || entry.old_values?.rule_name || 'Unknown rule'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingRule) && (
        <PricingRuleDialog
          rule={editingRule}
          open={showCreateDialog || !!editingRule}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingRule(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default PricingRulesManagement;
