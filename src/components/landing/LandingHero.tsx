import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, CheckCircle2, FileText, Activity, Zap, ShieldCheck, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { motion } from "framer-motion";
import { useApplicationStats } from "@/hooks/useApplicationStats";
import { Skeleton } from "@/components/ui/skeleton";

const LandingHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { data: statsData, isLoading } = useApplicationStats();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden bg-background pt-20 pb-12 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-28">
      {/* Subtle background grid + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)] opacity-40" />
        <div className="absolute -top-32 ltr:-right-32 rtl:-left-32 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl space-y-6 sm:space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {t.hero.trustLine.split("•")[0].trim()}
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
              {t.hero.headline}{" "}
              <span className="relative inline-block text-primary">
                {t.hero.headlineHighlight}
                <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-primary/25" />
              </span>
            </h1>

            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.hero.subheadline}
            </p>

            <ul className="space-y-2.5">
              {[t.hero.benefit1, t.hero.benefit2, t.hero.benefit3].map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigate(user ? "/new-order" : "/auth")}
                className="group h-12 rounded-xl px-7 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              >
                <Stethoscope className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t.hero.forDentists}
                <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(user ? "/lab-admin" : "/auth")}
                className="group h-12 rounded-xl px-7 text-base font-semibold"
              >
                <Building2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t.hero.forLabs}
                <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{t.hero.trustLine}</p>
          </motion.div>

          {/* RIGHT: Bento product preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent blur-2xl" />
            <div className="relative rounded-3xl border border-border bg-card/70 p-3 shadow-2xl shadow-primary/10 backdrop-blur-xl sm:p-4">
              {/* window chrome */}
              <div className="mb-3 flex items-center gap-1.5 border-b border-border pb-3 px-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <div className="ltr:ml-3 rtl:mr-3 h-4 w-32 rounded-full bg-muted" />
              </div>

              {/* bento grid */}
              <div className="grid grid-cols-2 gap-3">
                <BentoStat
                  icon={<Activity className="h-4 w-4" />}
                  label={t.landing.heroExtras.activeLabs}
                  value={isLoading ? <Skeleton className="h-7 w-14" /> : `${statsData?.activeLabs || 12}+`}
                  tone="primary"
                />
                <BentoStat
                  icon={<Zap className="h-4 w-4" />}
                  label={t.landing.heroExtras.ordersProcessed}
                  value={isLoading ? <Skeleton className="h-7 w-16" /> : `${statsData?.totalOrders || 1000}+`}
                  tone="success"
                />
                <BentoStat
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label={t.hero.orderVisibility}
                  value="100%"
                  tone="primary"
                />
                <BentoStat
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label={t.landing.heroExtras.onTime}
                  value="98%"
                  tone="success"
                />
              </div>

              {/* mini order card */}
              <div className="mt-3 rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground" dir="ltr">Order #LL-4921</div>
                      <div className="text-[10px] text-muted-foreground">{t.landing.heroExtras.sampleProduct}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {t.landing.heroExtras.inProgress}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "68%" }}
                    transition={{ duration: 1.2, delay: 0.6 }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t.landing.heroExtras.labAccepted}</span>
                  <span>{t.landing.heroExtras.readyIn}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const BentoStat = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  tone: "primary" | "success";
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div
      className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
      }`}
    >
      {icon}
    </div>
    <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
  </div>
);

export default LandingHero;
