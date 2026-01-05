import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
}

interface PricingRuleDialogProps {
  rule: PricingRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RULE_TYPES = [
  { value: 'base_price', label: 'Base Price' },
  { value: 'multiplier', label: 'Multiplier (%)' },
  { value: 'flat_fee', label: 'Flat Fee' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'bonus', label: 'Bonus' },
];

const RESTORATION_TYPES = [
  'Zirconia',
  'Zirconia Layer',
  'Zirco-Max',
  'PFM',
  'Acrylic',
  'E-max',
];

const URGENCY_LEVELS = ['Normal', 'Urgent'];

const PricingRuleDialog = ({ rule, open, onOpenChange }: PricingRuleDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!rule;

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'base_price',
    restoration_type: '',
    urgency_level: '',
    amount: '',
    is_percentage: false,
    priority: '10',
    is_active: true,
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        restoration_type: rule.restoration_type || '',
        urgency_level: rule.urgency_level || '',
        amount: rule.amount.toString(),
        is_percentage: rule.is_percentage,
        priority: rule.priority.toString(),
        is_active: rule.is_active,
      });
    } else {
      setFormData({
        rule_name: '',
        rule_type: 'base_price',
        restoration_type: '',
        urgency_level: '',
        amount: '',
        is_percentage: false,
        priority: '10',
        is_active: true,
      });
    }
  }, [rule]);

  // Auto-set is_percentage based on rule type
  useEffect(() => {
    if (formData.rule_type === 'multiplier' || formData.rule_type === 'penalty' || formData.rule_type === 'bonus') {
      setFormData(prev => ({ ...prev, is_percentage: true }));
    } else {
      setFormData(prev => ({ ...prev, is_percentage: false }));
    }
  }, [formData.rule_type]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount < 0) throw new Error("Invalid amount");
      if (!formData.rule_name.trim()) throw new Error("Rule name is required");

      const restorationTypeValue = formData.restoration_type as any || null;
      const urgencyLevelValue = formData.urgency_level as any || null;

      const ruleData = {
        rule_name: formData.rule_name.trim(),
        rule_type: formData.rule_type,
        restoration_type: restorationTypeValue,
        urgency_level: urgencyLevelValue,
        amount,
        is_percentage: formData.is_percentage,
        priority: parseInt(formData.priority) || 10,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && rule) {
        // Update existing rule
        const { error } = await supabase
          .from('pricing_rules')
          .update(ruleData)
          .eq('id', rule.id);
        if (error) throw error;

        // Log audit
        await supabase.from('pricing_rules_audit').insert({
          rule_id: rule.id,
          action: 'updated',
          old_values: rule as any,
          new_values: { ...rule, ...ruleData } as any,
          changed_by: user?.id
        });
      } else {
        // Create new rule
        const { data: newRule, error } = await supabase
          .from('pricing_rules')
          .insert(ruleData)
          .select()
          .single();
        if (error) throw error;

        // Log audit
        await supabase.from('pricing_rules_audit').insert({
          rule_id: newRule.id,
          action: 'created',
          new_values: newRule as any,
          changed_by: user?.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-rules-audit'] });
      toast.success(isEditing ? 'Rule updated' : 'Rule created');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save rule', { description: error.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!rule) return;

      // Log audit before delete
      await supabase.from('pricing_rules_audit').insert({
        rule_id: rule.id,
        action: 'deleted',
        old_values: rule as any,
        changed_by: user?.id
      });

      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', rule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-rules-audit'] });
      toast.success('Rule deleted');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete rule', { description: error.message });
    }
  });

  const isPending = saveMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Pricing Rule' : 'Create Pricing Rule'}</DialogTitle>
          <DialogDescription>
            Configure pricing logic for invoice calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ruleName">Rule Name *</Label>
            <Input
              id="ruleName"
              placeholder="e.g., Zirconia Base Price"
              value={formData.rule_name}
              onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Type *</Label>
              <Select 
                value={formData.rule_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, rule_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder={formData.is_percentage ? "25" : "150"}
                  min={0}
                  step={0.01}
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
                <span className="text-sm text-muted-foreground w-8">
                  {formData.is_percentage ? '%' : '$'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Restoration Type</Label>
              <Select 
                value={formData.restoration_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, restoration_type: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {RESTORATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select 
                value={formData.urgency_level} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, urgency_level: v === 'all' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {URGENCY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority (lower = higher priority)</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={100}
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Enable this rule for invoice calculations</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && (
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Delete Rule
            </Button>
          )}
          <div className="flex-1" />
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={isPending || !formData.rule_name.trim() || !formData.amount}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PricingRuleDialog;
