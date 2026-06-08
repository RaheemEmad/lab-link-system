import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageCircle, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { toast } from "sonner";

type Mode = "email" | "whatsapp";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s\-()]{7,20}$/;

interface Props {
  /** Source label saved with the lead (e.g. "landing-hero", "how-it-works"). */
  source?: string;
  /** Optional layout tweak - "card" for inline card, "band" for full-width band. */
  variant?: "card" | "band";
}

const LeadCaptureCTA = ({ source = "landing", variant = "card" }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const [mode, setMode] = useState<Mode>("email");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    const v = value.trim();
    if (!v) return "Please enter a contact";
    if (mode === "email" && !emailRe.test(v)) return "Please enter a valid email";
    if (mode === "whatsapp" && !phoneRe.test(v)) return "Please enter a valid phone number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("landing_leads").insert({
      contact_type: mode,
      contact_value: value.trim(),
      source,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not save your details. Please try again.");
      return;
    }
    setSuccess(true);
  };

  const goToOrder = () => navigate(user ? "/new-order" : "/auth?redirect=/new-order");

  const wrapperClass =
    variant === "band"
      ? "relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-accent/5 p-8 sm:p-12 shadow-xl"
      : "relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg";

  return (
    <div className={wrapperClass}>
      <div className="absolute -top-16 ltr:-right-16 rtl:-left-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            <div className="mb-5 max-w-xl">
              <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Start your first order in 2 minutes
              </h3>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Drop your email or WhatsApp and we'll take you straight to the digital order form.
              </p>
            </div>

            {/* Mode switch */}
            <div className="mb-4 inline-flex rounded-xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setMode("email")}
                aria-pressed={mode === "email"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => setMode("whatsapp")}
                aria-pressed={mode === "whatsapp"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "whatsapp"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type={mode === "email" ? "email" : "tel"}
                inputMode={mode === "email" ? "email" : "tel"}
                placeholder={mode === "email" ? "you@clinic.com" : "+20 100 123 4567"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                disabled={submitting}
                className="h-12 flex-1 rounded-xl text-base"
                aria-label={mode === "email" ? "Email address" : "WhatsApp number"}
              />
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="group h-12 rounded-xl px-6 text-base font-semibold shadow-lg shadow-primary/20"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-3 text-xs text-muted-foreground">
              No spam. We'll only use this to follow up on your first order.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col items-start gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="max-w-xl">
              <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                You're in. Let's create your order.
              </h3>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                We saved your {mode === "email" ? "email" : "WhatsApp number"} (
                <span className="font-medium text-foreground">{value.trim()}</span>). Continue to the
                digital order form to send your first case to a verified lab.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={goToOrder}
                className="group h-12 rounded-xl px-6 text-base font-semibold shadow-lg shadow-primary/20"
              >
                Open the order form
                <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => {
                  setSuccess(false);
                  setValue("");
                }}
                className="h-12 rounded-xl px-4 text-sm"
              >
                Submit another contact
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadCaptureCTA;
