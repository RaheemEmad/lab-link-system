// Locale-aware renewal period text + currency formatting helpers.
// Centralises the strings used by PlanCard and PaymentInstructions so the
// WhatsApp template and on-screen preview always agree.

export type BillingPeriod = "monthly" | "yearly" | "trial" | "free";
export type AppLocale = "en" | "ar";

export const getCurrencyFormatter = (locale: AppLocale) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  });

export const inferBillingPeriod = (
  monthlyFee: number,
  explicit?: BillingPeriod | null,
): BillingPeriod => {
  if (explicit) return explicit;
  if (!monthlyFee || monthlyFee <= 0) return "free";
  return "monthly";
};

interface RenewalOpts {
  locale: AppLocale;
  period: BillingPeriod;
  /** Optional trial length in days for trial period. */
  trialDays?: number;
  /** Optional explicit next renewal date. */
  nextRenewalAt?: Date | string | null;
}

const dateFmt = (locale: AppLocale, d: Date) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

const pluralDays = (locale: AppLocale, n: number) => {
  if (locale === "ar") {
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    if (n >= 3 && n <= 10) return `${n} أيام`;
    return `${n} يوماً`;
  }
  return n === 1 ? "1 day" : `${n} days`;
};

export const formatRenewal = ({ locale, period, trialDays, nextRenewalAt }: RenewalOpts): string => {
  const isAr = locale === "ar";
  const when = nextRenewalAt ? new Date(nextRenewalAt) : null;
  const whenStr = when && !isNaN(when.getTime()) ? dateFmt(locale, when) : null;

  switch (period) {
    case "free":
      return isAr ? "مجاني — لا يوجد تجديد" : "Free — no renewal";
    case "trial": {
      const days = trialDays && trialDays > 0 ? trialDays : 14;
      const len = pluralDays(locale, days);
      if (isAr) {
        return whenStr
          ? `تجربة مجانية لمدة ${len} (تنتهي في ${whenStr})`
          : `تجربة مجانية لمدة ${len}`;
      }
      return whenStr
        ? `Free trial for ${len} (ends ${whenStr})`
        : `Free trial for ${len}`;
    }
    case "yearly":
      if (isAr) {
        return whenStr
          ? `سنوي (يتجدد تلقائياً في ${whenStr})`
          : "سنوي (يتجدد تلقائياً كل سنة حتى الإلغاء)";
      }
      return whenStr
        ? `Yearly (auto-renews on ${whenStr})`
        : "Yearly (auto-renews each year until cancelled)";
    case "monthly":
    default:
      if (isAr) {
        return whenStr
          ? `شهري (يتجدد تلقائياً في ${whenStr})`
          : "شهري (يتجدد تلقائياً كل شهر حتى الإلغاء)";
      }
      return whenStr
        ? `Monthly (auto-renews on ${whenStr})`
        : "Monthly (auto-renews each month until cancelled)";
  }
};

export const periodUnitLabel = (locale: AppLocale, period: BillingPeriod) => {
  const isAr = locale === "ar";
  switch (period) {
    case "yearly":
      return isAr ? "سنة" : "year";
    case "trial":
    case "free":
      return isAr ? "—" : "—";
    case "monthly":
    default:
      return isAr ? "شهر" : "month";
  }
};
