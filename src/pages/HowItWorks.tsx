import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Send,
  CheckCircle,
  Package,
  Truck,
  Bell,
  Clock,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import LeadCaptureCTA from "@/components/landing/LeadCaptureCTA";

const steps = [
  {
    icon: FileText,
    title: "Create Order",
    description:
      "Dentist fills a simple digital form with patient details, restoration type, shade, and tooth numbers. No more messy WhatsApp threads.",
  },
  {
    icon: Send,
    title: "Instant Submission",
    description: "Order is sent to the lab instantly — fully organized, with photos and notes attached securely.",
  },
  {
    icon: CheckCircle,
    title: "Lab Confirms",
    description: "Lab staff sees the order in their dashboard, reviews details, and accepts with one click.",
  },
  {
    icon: Package,
    title: "Production Updates",
    description: "Lab updates status as work progresses: In Progress → QC → Ready. Dentist sees it in real time.",
  },
  {
    icon: Truck,
    title: "Delivery Tracking",
    description: "When ready, the lab adds shipment info. Dentist is notified and can track delivery progress.",
  },
  {
    icon: Bell,
    title: "Completion",
    description: "Order marked delivered. Full history preserved for reference, QC, and future orders.",
  },
];

const features = [
  { icon: Clock, title: "Real-Time Updates", description: "Both dentist and lab see status changes instantly." },
  { icon: Users, title: "Clear Communication", description: "Add notes and chat at any stage of the process." },
  { icon: BarChart3, title: "Complete History", description: "Full audit trail of every order from start to finish." },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-background py-20 sm:py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_50%_40%_at_50%_30%,black,transparent)] opacity-40" />
          </div>
          <div className="container relative z-10 mx-auto max-w-3xl px-4 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              How It Works
            </div>
            <h1 className="mb-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              From impression to insert — <span className="text-primary">without the friction</span>
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              A transparent six-step workflow connecting dentists and labs seamlessly.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="relative grid gap-5 md:grid-cols-2">
              {/* vertical line on desktop */}
              <div className="absolute left-1/2 top-0 bottom-0 hidden w-px -translate-x-1/2 bg-border md:block" />
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg sm:p-7"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-muted/30 py-20 sm:py-24">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Key features at every step
              </h2>
              <p className="text-muted-foreground">Built so nothing falls through the cracks.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-foreground p-10 text-center text-background sm:p-14">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to streamline your workflow?
                </h2>
                <p className="mx-auto mb-8 max-w-xl text-background/70">
                  Start managing your dental lab orders with precision and clarity today.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="group h-12 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="h-12 rounded-xl border-background/20 bg-transparent px-7 text-base font-semibold text-background hover:bg-background/10"
                  >
                    Contact Us
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default HowItWorks;
