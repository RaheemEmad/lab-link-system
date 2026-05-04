import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Stethoscope, Building2, TrendingUp, Users, Shield, Wallet, ScanLine, MessageSquare, BarChart3, Globe2, Sparkles, CheckCircle2 } from "lucide-react";
import { useApplicationStats } from "@/hooks/useApplicationStats";

const doctorBenefits = [
  { icon: ScanLine, title: "AI Shade Match", desc: "Snap a tooth photo and get instant shade suggestions powered by Gemini vision." },
  { icon: Building2, title: "Verified Lab Marketplace", desc: "Compare quotes from trusted labs ranked by trust score, on-time rate, and price." },
  { icon: MessageSquare, title: "Live Case Room", desc: "Chat, share 3D scans and photos, approve designs — all in one collaboration hub." },
  { icon: Wallet, title: "Safe Manual Payments", desc: "InstaPay & Vodafone Cash with WhatsApp confirmation templates and admin verification." },
];

const labBenefits = [
  { icon: Users, title: "Inbound Case Pipeline", desc: "Real-time marketplace of clinic orders matched to your specialization and capacity." },
  { icon: BarChart3, title: "Workload & SLA Heatmap", desc: "See what's due today, this week, and where you're overbooked." },
  { icon: Shield, title: "Trust & Verification", desc: "Build a verified profile with gallery, reviews, and on-time stats — win more orders." },
  { icon: TrendingUp, title: "Subscription Tiers", desc: "Pay per order or upgrade for lower fees, priority placement, and AI recommendations." },
];

const investorMetrics = [
  { label: "Egyptian dental clinics (TAM)", value: "30,000+" },
  { label: "Active dental labs", value: "1,000+" },
  { label: "Average WhatsApp orders / lab / month", value: "120" },
  { label: "Take-rate per order", value: "7–15 EGP" },
];

const ValuePropSection = () => {
  const { data: stats } = useApplicationStats();
  const [tab, setTab] = useState<"doctors" | "labs" | "investors">("doctors");

  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
      <div className="container px-4 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Built for everyone in the dental supply chain
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            One platform. Three audiences. Zero WhatsApp chaos.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            LabLink replaces fragmented chats, paper slips, and mental tracking with a single source of truth.
          </p>
        </motion.div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 h-auto p-1">
            <TabsTrigger value="doctors" className="py-2.5 gap-2"><Stethoscope className="w-4 h-4" /> Doctors</TabsTrigger>
            <TabsTrigger value="labs" className="py-2.5 gap-2"><Building2 className="w-4 h-4" /> Labs</TabsTrigger>
            <TabsTrigger value="investors" className="py-2.5 gap-2"><TrendingUp className="w-4 h-4" /> Investors</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {doctorBenefits.map((b, i) => (
                <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Card className="h-full border-border/60 hover:border-primary/40 transition">
                    <CardContent className="pt-6">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <b.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1">{b.title}</h3>
                      <p className="text-sm text-muted-foreground">{b.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="labs" className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {labBenefits.map((b, i) => (
                <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Card className="h-full border-border/60 hover:border-accent/40 transition">
                    <CardContent className="pt-6">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <b.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-semibold mb-1">{b.title}</h3>
                      <p className="text-sm text-muted-foreground">{b.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="investors" className="mt-8">
            <Card className="border-primary/20 overflow-hidden">
              <CardContent className="p-6 sm:p-10">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium mb-4">
                      <Globe2 className="w-3.5 h-3.5" /> Egypt → MENA
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">A vertical SaaS marketplace in a $1B+ regional dental services market</h3>
                    <p className="text-muted-foreground mb-6">
                      LabLink monetizes per-order fees, verified-lab subscriptions, and value-added services
                      (AI shade match, logistics, financing). Already running with real orders, real labs,
                      and a real payment loop.
                    </p>
                    <ul className="space-y-2 text-sm">
                      {[
                        "Two-sided network effects: more verified labs → more clinic retention",
                        "Sticky workflow software (orders, chat, invoicing, wallet) — not just a directory",
                        "Bilingual EN/AR, mobile-first PWA, ready for cross-border expansion",
                      ].map((line) => (
                        <li key={line} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
                      <div className="text-xs text-muted-foreground mb-1">Live active labs</div>
                      <div className="text-3xl font-bold">{stats?.activeLabs ?? "—"}</div>
                    </div>
                    <div className="rounded-xl border bg-gradient-to-br from-accent/5 to-transparent p-4">
                      <div className="text-xs text-muted-foreground mb-1">Orders processed</div>
                      <div className="text-3xl font-bold">{stats?.totalOrders ?? "—"}</div>
                    </div>
                    {investorMetrics.map((m) => (
                      <div key={m.label} className="rounded-xl border p-4">
                        <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                        <div className="text-xl font-bold">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default ValuePropSection;
