import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/sonner";
import { Loader2, Smartphone, Wallet } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
}

type Method = "instapay" | "vodafone_cash";

// Egyptian mobile number for Vodafone Cash (010, 011, 012, 015 + 8 digits)
const EG_PHONE_RE = /^01[0125]\d{8}$/;
// InstaPay handle: either an Egyptian mobile, an IBAN-like string, or user@bank
const INSTAPAY_RE = /^([A-Za-z0-9._-]+@[A-Za-z0-9.-]+|01[0125]\d{8}|EG\d{27})$/;

export const WithdrawalDialog = ({ open, onOpenChange, availableBalance }: WithdrawalDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<Method>("instapay");
  const [amount, setAmount] = useState("");
  const [payoutHandle, setPayoutHandle] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setAmount("");
    setPayoutHandle("");
    setNotes("");
    setMethod("instapay");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount.");
      if (amt > availableBalance) throw new Error("Amount exceeds your available balance.");

      const handle = payoutHandle.trim();
      if (!handle) throw new Error("Enter your payout details.");
      if (method === "vodafone_cash" && !EG_PHONE_RE.test(handle)) {
        throw new Error("Enter a valid Vodafone Cash number (e.g. 010xxxxxxxx).");
      }
      if (method === "instapay" && !INSTAPAY_RE.test(handle)) {
        throw new Error("Enter a valid InstaPay address, mobile number, or IBAN.");
      }

      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user!.id,
        amount: amt,
        method,
        payout_handle: handle,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request sent", {
        description: "An admin will review your request and process the payout shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Could not submit withdrawal", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Request a Withdrawal
          </DialogTitle>
          <DialogDescription>
            Available balance: <span className="font-semibold text-foreground">{availableBalance.toLocaleString()} EGP</span>.
            Payouts are sent manually by our admins via InstaPay or Vodafone Cash within 1–2 business days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Payout method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)} className="grid grid-cols-2 gap-2">
              <Label
                htmlFor="m-instapay"
                className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer min-h-11 ${
                  method === "instapay" ? "border-primary bg-primary/5" : "border-input"
                }`}
              >
                <RadioGroupItem id="m-instapay" value="instapay" />
                <Smartphone className="h-4 w-4" /> InstaPay
              </Label>
              <Label
                htmlFor="m-vodafone"
                className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer min-h-11 ${
                  method === "vodafone_cash" ? "border-primary bg-primary/5" : "border-input"
                }`}
              >
                <RadioGroupItem id="m-vodafone" value="vodafone_cash" />
                <Smartphone className="h-4 w-4" /> Vodafone Cash
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-amount">Amount (EGP)</Label>
            <Input
              id="wd-amount"
              type="number"
              min={1}
              max={availableBalance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="min-h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-handle">
              {method === "instapay" ? "InstaPay address / mobile / IBAN" : "Vodafone Cash number"}
            </Label>
            <Input
              id="wd-handle"
              value={payoutHandle}
              onChange={(e) => setPayoutHandle(e.target.value)}
              placeholder={method === "instapay" ? "name@bank or 010xxxxxxxx" : "010xxxxxxxx"}
              autoComplete="off"
              className="min-h-11"
            />
            <p className="text-xs text-muted-foreground">
              Make sure this {method === "instapay" ? "InstaPay address" : "Vodafone Cash number"} is registered in your name and active.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-notes">Note to admin (optional)</Label>
            <Textarea
              id="wd-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know about this payout"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
