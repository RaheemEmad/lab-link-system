import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Phone, Copy, CheckCircle2, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface PaymentInstructionsProps {
  planId?: string;
  planName?: string;
  amount?: number;
  context?: "onboarding" | "plans" | "wallet" | "deposit";
  onSuccess?: () => void;
}

export const PaymentInstructions = ({ planId, planName, amount, context = "wallet", onSuccess }: PaymentInstructionsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("instapay");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [phoneUsed, setPhoneUsed] = useState("");
  const [notes, setNotes] = useState("");

  const PAYMENT_PHONE = "+201018385093";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("payment_confirmations")
        .insert({
          user_id: user.id,
          plan_id: planId || null,
          payment_method: paymentMethod,
          amount: amount || 0,
          phone_used: phoneUsed || null,
          reference_number: referenceNumber || null,
          notes: notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-payments"] });
      toast.success("Payment confirmation submitted!", {
        description: "Our team will review and confirm your payment shortly.",
      });
      setShowConfirmForm(false);
      setReferenceNumber("");
      setPhoneUsed("");
      setNotes("");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to submit confirmation. Please try again.");
    },
  });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          {context === "deposit"
            ? "Pay your 100 EGP commitment deposit"
            : planName
              ? `Pay for ${planName} plan`
              : "Add funds to your wallet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* InstaPay */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">InstaPay</Badge>
              <span className="text-sm font-medium">Recommended</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://www.instapay.eg/?lang=en", "_blank")}
              className="text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open InstaPay
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Send to: <span className="font-mono font-semibold text-foreground">{PAYMENT_PHONE}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(PAYMENT_PHONE)}>
              <Copy className="h-3 w-3" />
            </Button>
          </p>
          {amount && (
            <p className="text-sm">Amount: <span className="font-bold text-primary">{amount} EGP</span></p>
          )}
        </div>

        {/* Vodafone Cash */}
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-200">Vodafone Cash</Badge>
            <span className="text-sm text-muted-foreground">Alternative</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Send to: <span className="font-mono font-semibold text-foreground">{PAYMENT_PHONE}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => copyToClipboard(PAYMENT_PHONE)}>
              <Copy className="h-3 w-3" />
            </Button>
          </p>
          {amount && (
            <p className="text-sm">Amount: <span className="font-bold text-primary">{amount} EGP</span></p>
          )}
        </div>

        {/* WhatsApp Confirmation */}
        <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Confirm via WhatsApp</span>
          </div>
          <p className="text-xs text-muted-foreground">
            After sending payment, confirm via WhatsApp call to {PAYMENT_PHONE}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-300 hover:bg-green-50"
            onClick={() => window.open(`https://wa.me/${PAYMENT_PHONE.replace('+', '')}`, "_blank")}
          >
            <Phone className="h-3 w-3 mr-1" />
            Open WhatsApp
          </Button>
        </div>

        {/* Submit Confirmation Form */}
        {!showConfirmForm ? (
          <Button onClick={() => setShowConfirmForm(true)} className="w-full" variant="default">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            I've Sent the Payment
          </Button>
        ) : (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium">Confirm Your Payment</p>
            <div className="space-y-2">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instapay">InstaPay</SelectItem>
                  <SelectItem value="vodafone_cash">Vodafone Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reference/Transaction Number (optional)</Label>
              <Input
                placeholder="e.g. TXN123456"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone Number Used</Label>
              <Input
                placeholder="e.g. 01012345678"
                value={phoneUsed}
                onChange={(e) => setPhoneUsed(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="flex-1">
                {submitMutation.isPending ? "Submitting..." : "Submit Confirmation"}
              </Button>
              <Button variant="ghost" onClick={() => setShowConfirmForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
