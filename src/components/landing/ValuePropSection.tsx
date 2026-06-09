import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Stethoscope, Building2, TrendingUp, Users, Shield, Wallet, ScanLine, MessageSquare, BarChart3, Globe2, Sparkles, CheckCircle2 } from "lucide-react";
import { useApplicationStats } from "@/hooks/useApplicationStats";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ValuePropSection = () => {
  const { data: stats } = useApplicationStats();
  const { t } = useLanguage();
  const v = t.landing.valueProp;
  const [tab, setTab] = useState<"doctors" | "labs" | "investors">("doctors");

  const doctorBenefits = [
    { icon: ScanLine, title: v.docs.aiT, desc: v.docs.aiD },
    { icon: Building2, title: v.docs.mktT, desc: v.docs.mktD },
    { icon: MessageSquare, title: v.docs.roomT, desc: v.docs.roomD },
    { icon: Wallet, title: v.docs.payT, desc: v.docs.payD },
  ];

  const labBenefits = [
    { icon: Users, title: v.labs.pipeT, desc: v.labs.pipeD },
    { icon: BarChart3, title: v.labs.heatT, desc: v.labs.heatD },
    { icon: Shield, title: v.labs.trustT, desc: v.labs.trustD },
    { icon: TrendingUp, title: v.labs.tierT, desc: v.labs.tierD },
  ];

  const investorMetrics = [
    { label: v.inv.mClinics, value: "30,000+" },
    { label: v.inv.mLabs, value: "1,000+" },
    { label: v.inv.mWa, value: "120" },
    { label: v.inv.mTake, value: "7–15 EGP" },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
      <div className="container px-4 mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> {v.badge}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">{v.headline}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{v.sub}</p>
        </motion.div>

        <Tabs value={tab} onValueChange={(val) => setTab(val as typeof tab)} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 h-auto p-1">
            <TabsTrigger value="doctors" className="py-2.5 gap-2"><Stethoscope className="w-4 h-4" /> {v.tabDoctors}</TabsTrigger>
            <TabsTrigger value="labs" className="py-2.5 gap-2"><Building2 className="w-4 h-4" /> {v.tabLabs}</TabsTrigger>
            <TabsTrigger value="investors" className="py-2.5 gap-2"><TrendingUp className="w-4 h-4" /> {v.tabInvestors}</TabsTrigger>
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
                      <Globe2 className="w-3.5 h-3.5" /> {v.inv.badge}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">{v.inv.headline}</h3>
                    <p className="text-muted-foreground mb-6">{v.inv.body}</p>
                    <ul className="space-y-2 text-sm">
                      {[v.inv.bullet1, v.inv.bullet2, v.inv.bullet3].map((line) => (
                        <li key={line} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
                      <div className="text-xs text-muted-foreground mb-1">{v.inv.liveLabs}</div>
                      <div className="text-3xl font-bold">{stats?.activeLabs ?? "-"}</div>
                    </div>
                    <div className="rounded-xl border bg-gradient-to-br from-accent/5 to-transparent p-4">
                      <div className="text-xs text-muted-foreground mb-1">{v.inv.ordersProcessed}</div>
                      <div className="text-3xl font-bold">{stats?.totalOrders ?? "-"}</div>
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
