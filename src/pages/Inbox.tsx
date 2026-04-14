import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/layouts/PageLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useInboxItems, type InboxItemType } from "@/hooks/useInboxItems";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox as InboxIcon, MessageSquare, Palette, PackageCheck, Receipt,
  Reply, CheckCircle2, XCircle, CreditCard, RefreshCw,
  Bell, MessageCircleMore, Star, Wallet
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

type FilterTab = "all" | InboxItemType;

const TABS: { key: FilterTab; icon: React.ElementType }[] = [
  { key: "all", icon: InboxIcon },
  { key: "chat", icon: MessageSquare },
  { key: "approval", icon: Palette },
  { key: "delivery", icon: PackageCheck },
  { key: "invoice", icon: Receipt },
  { key: "payment", icon: Wallet },
  { key: "notification", icon: Bell },
  { key: "feedback", icon: MessageCircleMore },
  { key: "review", icon: Star },
];

const TYPE_STYLES: Record<InboxItemType, { badge: string; label: string }> = {
  chat: { badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", label: "Chat" },
  approval: { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "Approval" },
  delivery: { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", label: "Delivery" },
  invoice: { badge: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", label: "Invoice" },
  payment: { badge: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30", label: "Payment" },
  notification: { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30", label: "Alert" },
  feedback: { badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", label: "Feedback" },
  review: { badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", label: "Review" },
};

const InboxPage = () => {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { items, counts, isLoading, refetchAll } = useInboxItems(activeTab);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tabLabel = (key: FilterTab): string => {
    const map: Record<FilterTab, string> = {
      all: t.inbox?.all ?? "All",
      chat: t.inbox?.chats ?? "Chats",
      approval: t.inbox?.approvals ?? "Approvals",
      delivery: t.inbox?.deliveries ?? "Deliveries",
      invoice: t.inbox?.invoices ?? "Invoices",
      payment: "Payments",
      notification: "Alerts",
      feedback: "Feedback",
      review: "Reviews",
    };
    return map[key];
  };

  const countForTab = (key: FilterTab) =>
    key === "all" ? counts.all : counts[key];

  const handleReply = (orderId: string) => navigate(`/feedback-room/${orderId}`);

  const handleApprove = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ design_approved: true }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Design approved" }); queryClient.invalidateQueries({ queryKey: ["inbox-approvals"] }); }
  };

  const handleReject = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ design_approved: false }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Design rejected" }); queryClient.invalidateQueries({ queryKey: ["inbox-approvals"] }); }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({
      delivery_pending_confirmation: false,
      delivery_confirmed_at: new Date().toISOString(),
      status: "Delivered" as never,
    }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Delivery confirmed" }); queryClient.invalidateQueries({ queryKey: ["inbox-deliveries"] }); }
  };

  const handlePay = (orderId: string) => navigate(`/dashboard?tab=billing&orderId=${orderId}`);

  const getQuickAction = (item: typeof items[0]) => {
    switch (item.type) {
      case "chat":
        return (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleReply(item.orderId)}>
            <Reply className="h-3 w-3 ltr:mr-1 rtl:ml-1" />{t.inbox?.reply ?? "Reply"}
          </Button>
        );
      case "approval":
        return (
          <>
            <Button size="sm" className="h-8 text-xs" onClick={() => handleApprove(item.orderId)}>
              <CheckCircle2 className="h-3 w-3 ltr:mr-1 rtl:ml-1" />{t.inbox?.approve ?? "Approve"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => handleReject(item.orderId)}>
              <XCircle className="h-3 w-3 ltr:mr-1 rtl:ml-1" />{t.inbox?.reject ?? "Reject"}
            </Button>
          </>
        );
      case "delivery":
        return (
          <Button size="sm" className="h-8 text-xs" onClick={() => handleConfirmDelivery(item.orderId)}>
            <PackageCheck className="h-3 w-3 ltr:mr-1 rtl:ml-1" />{t.inbox?.confirmDelivery ?? "Confirm"}
          </Button>
        );
      case "invoice":
        return (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handlePay(item.orderId)}>
            <CreditCard className="h-3 w-3 ltr:mr-1 rtl:ml-1" />{t.inbox?.payNow ?? "Pay"}
          </Button>
        );
      case "payment":
        return (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate("/wallet")}>
            <Wallet className="h-3 w-3 ltr:mr-1 rtl:ml-1" />View
          </Button>
        );
      case "feedback":
        return (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleReply(item.orderId)}>
            <MessageCircleMore className="h-3 w-3 ltr:mr-1 rtl:ml-1" />Respond
          </Button>
        );
      case "review":
        return (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/labs/${(item.metadata as any)?.labId}`)}>
            <Star className="h-3 w-3 ltr:mr-1 rtl:ml-1" />Review
          </Button>
        );
      case "notification":
        return item.orderId ? (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/order-tracking?orderId=${item.orderId}`)}>
            View
          </Button>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <PageLayout maxWidth="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.inbox?.title ?? "Inbox"}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.inbox?.subtitle ?? "Everything that needs your attention"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={refetchAll} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(Object.keys(TYPE_STYLES) as InboxItemType[]).map((type) =>
            counts[type] > 0 ? (
              <Badge key={type} variant="outline" className={cn("text-xs font-medium", TYPE_STYLES[type].badge)}>
                {TYPE_STYLES[type].label}: {counts[type]}
              </Badge>
            ) : null
          )}
        </div>

        {/* Filter tabs */}
        <ScrollArea className="w-full mb-6">
          <div className="flex gap-1 pb-2">
            {TABS.map(({ key, icon: Icon }) => {
              const count = countForTab(key);
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tabLabel(key)}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1 min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-4"><div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/3" /></div>
              </div></CardContent></Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={InboxIcon} title={t.inbox?.allCaughtUp ?? "All caught up!"} description={t.inbox?.noItems ?? "No pending items need your attention right now."} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {items.map((item, idx) => {
                const style = TYPE_STYLES[item.type];
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: idx * 0.03 }}>
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {item.orderNumber && <span className="text-sm font-semibold text-foreground">#{item.orderNumber}</span>}
                              {item.patientName && <span className="text-xs text-muted-foreground">— {item.patientName}</span>}
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", style.badge)}>{style.label}</Badge>
                            </div>
                            <p className="text-sm font-medium text-foreground mb-0.5">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.preview}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-2">
                              {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : ""}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {getQuickAction(item)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </PageLayout>
    </ProtectedRoute>
  );
};

export default InboxPage;
