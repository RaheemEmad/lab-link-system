import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { useMemo } from "react";

export type InboxItemType = "chat" | "approval" | "delivery" | "invoice";

export interface InboxItem {
  id: string;
  type: InboxItemType;
  orderId: string;
  orderNumber: string;
  patientName: string;
  title: string;
  preview: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export const useInboxItems = (filter: InboxItemType | "all" = "all") => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isAdmin, labId } = useUserRole();
  const userId = user?.id;

  // 1. Unread chats
  const chatsQuery = useQuery({
    queryKey: ["inbox-chats", userId],
    queryFn: async (): Promise<InboxItem[]> => {
      if (!userId) return [];

      // Get orders accessible to this user
      let orderIds: string[] = [];

      if (isDoctor) {
        const { data } = await supabase
          .from("orders")
          .select("id, order_number, patient_name")
          .eq("doctor_id", userId)
          .eq("is_deleted", false);
        orderIds = data?.map((o) => o.id) || [];
        if (!orderIds.length) return [];

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, order_id, message_text, created_at, sender_role")
          .in("order_id", orderIds)
          .neq("sender_id", userId)
          .is("read_at", null)
          .order("created_at", { ascending: false });

        // Deduplicate: one item per order (latest msg)
        const seen = new Set<string>();
        const orderMap = new Map(data?.map((o) => [o.id, o]) || []);
        return (msgs || [])
          .filter((m) => {
            if (seen.has(m.order_id)) return false;
            seen.add(m.order_id);
            return true;
          })
          .map((m) => {
            const order = orderMap.get(m.order_id);
            return {
              id: m.id,
              type: "chat" as const,
              orderId: m.order_id,
              orderNumber: order?.order_number || "",
              patientName: order?.patient_name || "",
              title: `New message from ${m.sender_role}`,
              preview: m.message_text.slice(0, 120),
              timestamp: m.created_at || "",
              metadata: { senderRole: m.sender_role },
            };
          });
      }

      if (isLabStaff && labId) {
        const { data: assignments } = await supabase
          .from("order_assignments")
          .select("order_id")
          .eq("user_id", userId);

        orderIds = assignments?.map((a) => a.order_id) || [];
        if (!orderIds.length) return [];

        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, patient_name")
          .in("id", orderIds);

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, order_id, message_text, created_at, sender_role")
          .in("order_id", orderIds)
          .neq("sender_id", userId)
          .is("read_at", null)
          .order("created_at", { ascending: false });

        const seen = new Set<string>();
        const orderMap = new Map(orders?.map((o) => [o.id, o]) || []);
        return (msgs || [])
          .filter((m) => {
            if (seen.has(m.order_id)) return false;
            seen.add(m.order_id);
            return true;
          })
          .map((m) => {
            const order = orderMap.get(m.order_id);
            return {
              id: m.id,
              type: "chat" as const,
              orderId: m.order_id,
              orderNumber: order?.order_number || "",
              patientName: order?.patient_name || "",
              title: `New message from ${m.sender_role}`,
              preview: m.message_text.slice(0, 120),
              timestamp: m.created_at || "",
              metadata: { senderRole: m.sender_role },
            };
          });
      }

      return [];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // 2. Pending design approvals (doctor-only)
  const approvalsQuery = useQuery({
    queryKey: ["inbox-approvals", userId],
    queryFn: async (): Promise<InboxItem[]> => {
      if (!userId || !isDoctor) return [];

      const { data } = await supabase
        .from("orders")
        .select("id, order_number, patient_name, design_file_url, updated_at")
        .eq("doctor_id", userId)
        .eq("is_deleted", false)
        .not("design_file_url", "is", null)
        .is("design_approved", null);

      return (data || []).map((o) => ({
        id: `approval-${o.id}`,
        type: "approval" as const,
        orderId: o.id,
        orderNumber: o.order_number,
        patientName: o.patient_name,
        title: "Design ready for review",
        preview: "A new design has been uploaded and is awaiting your approval.",
        timestamp: o.updated_at || "",
        metadata: { designUrl: o.design_file_url },
      }));
    },
    enabled: !!userId && isDoctor,
    staleTime: 30_000,
  });

  // 3. Delivery confirmations (doctor-only)
  const deliveriesQuery = useQuery({
    queryKey: ["inbox-deliveries", userId],
    queryFn: async (): Promise<InboxItem[]> => {
      if (!userId || !isDoctor) return [];

      const { data } = await supabase
        .from("orders")
        .select("id, order_number, patient_name, updated_at, carrier_name")
        .eq("doctor_id", userId)
        .eq("is_deleted", false)
        .eq("delivery_pending_confirmation", true);

      return (data || []).map((o) => ({
        id: `delivery-${o.id}`,
        type: "delivery" as const,
        orderId: o.id,
        orderNumber: o.order_number,
        patientName: o.patient_name,
        title: "Delivery awaiting confirmation",
        preview: o.carrier_name
          ? `Delivered via ${o.carrier_name}. Please confirm receipt.`
          : "Your order has been delivered. Please confirm receipt.",
        timestamp: o.updated_at || "",
        metadata: { carrier: o.carrier_name },
      }));
    },
    enabled: !!userId && isDoctor,
    staleTime: 30_000,
  });

  // 4. Overdue invoices
  const invoicesQuery = useQuery({
    queryKey: ["inbox-invoices", userId],
    queryFn: async (): Promise<InboxItem[]> => {
      if (!userId) return [];

      // Doctors see their own order invoices; lab staff see via RLS
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, final_total, due_date, order_id, updated_at, orders!inner(order_number, patient_name, doctor_id)")
        .eq("payment_status", "overdue");

      return (data || []).map((inv) => {
        const order = inv.orders as unknown as { order_number: string; patient_name: string; doctor_id: string };
        return {
          id: `invoice-${inv.id}`,
          type: "invoice" as const,
          orderId: inv.order_id,
          orderNumber: order?.order_number || "",
          patientName: order?.patient_name || "",
          title: `Invoice ${inv.invoice_number} overdue`,
          preview: `Amount due: EGP ${inv.final_total}${inv.due_date ? ` — Due: ${inv.due_date}` : ""}`,
          timestamp: inv.updated_at || "",
          metadata: { amount: inv.final_total, invoiceId: inv.id, dueDate: inv.due_date },
        };
      });
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const isLoading =
    chatsQuery.isLoading ||
    approvalsQuery.isLoading ||
    deliveriesQuery.isLoading ||
    invoicesQuery.isLoading;

  const items = useMemo(() => {
    const all: InboxItem[] = [
      ...(chatsQuery.data || []),
      ...(approvalsQuery.data || []),
      ...(deliveriesQuery.data || []),
      ...(invoicesQuery.data || []),
    ];

    const filtered = filter === "all" ? all : all.filter((i) => i.type === filter);

    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [chatsQuery.data, approvalsQuery.data, deliveriesQuery.data, invoicesQuery.data, filter]);

  const counts = useMemo(
    () => ({
      all:
        (chatsQuery.data?.length || 0) +
        (approvalsQuery.data?.length || 0) +
        (deliveriesQuery.data?.length || 0) +
        (invoicesQuery.data?.length || 0),
      chat: chatsQuery.data?.length || 0,
      approval: approvalsQuery.data?.length || 0,
      delivery: deliveriesQuery.data?.length || 0,
      invoice: invoicesQuery.data?.length || 0,
    }),
    [chatsQuery.data, approvalsQuery.data, deliveriesQuery.data, invoicesQuery.data]
  );

  const refetchAll = () => {
    chatsQuery.refetch();
    approvalsQuery.refetch();
    deliveriesQuery.refetch();
    invoicesQuery.refetch();
  };

  return { items, counts, isLoading, refetchAll };
};
