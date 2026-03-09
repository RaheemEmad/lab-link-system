import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

interface Conversation {
  user_id: string;
  full_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

const Messages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: loadingConvos } = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      // Get all messages involving this user
      const { data: messages, error } = await supabase
        .from("direct_messages")
        .select("sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by other user
      const convMap = new Map<string, { last_message: string; last_message_at: string; count: number }>();
      for (const msg of messages || []) {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            last_message: msg.content,
            last_message_at: msg.created_at,
            count: 0,
          });
        }
      }

      // Get unread counts
      const { data: unread } = await supabase
        .from("direct_messages")
        .select("sender_id")
        .eq("receiver_id", user!.id)
        .is("read_at", null);

      const unreadMap = new Map<string, number>();
      for (const u of unread || []) {
        unreadMap.set(u.sender_id, (unreadMap.get(u.sender_id) || 0) + 1);
      }

      // Get profile names
      const userIds = Array.from(convMap.keys());
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return userIds.map((id) => ({
        user_id: id,
        full_name: profileMap.get(id) || "Unknown User",
        last_message: convMap.get(id)!.last_message,
        last_message_at: convMap.get(id)!.last_message_at,
        unread_count: unreadMap.get(id) || 0,
      })) as Conversation[];
    },
    enabled: !!user?.id,
    staleTime: 20_000,
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["dm-messages", user?.id, selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Mark unread messages as read
      const unreadIds = data?.filter((m) => m.receiver_id === user!.id && !m.read_at).map((m) => m.id) || [];
      if (unreadIds.length) {
        await supabase
          .from("direct_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }

      return data;
    },
    enabled: !!user?.id && !!selectedUserId,
    staleTime: 10_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["dm-messages"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user!.id,
        receiver_id: selectedUserId!,
        content,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["dm-messages"] });
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
      // Notify receiver of new message
      if (selectedUserId) {
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user!.id)
          .single();
        await createNotification({
          user_id: selectedUserId,
          order_id: selectedUserId, // No order context, use receiver id as placeholder
          type: "new_message",
          title: "New Message",
          message: `${senderProfile?.full_name || "Someone"} sent you a message`,
        });
      }
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const selectedConvo = conversations?.find((c) => c.user_id === selectedUserId);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <LandingNav />
        <main className="flex-1 container max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-10">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Messages</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Conversations list */}
            <Card className={cn("md:col-span-1", selectedUserId && "hidden md:block")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  {loadingConvos ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !conversations?.length ? (
                    <div className="text-center py-8 px-4">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Start a conversation from a lab profile or preferred labs page
                      </p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.user_id}
                        onClick={() => setSelectedUserId(conv.user_id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50",
                          selectedUserId === conv.user_id && "bg-accent"
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs">
                            {conv.full_name?.slice(0, 2).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{conv.full_name}</p>
                            {conv.unread_count > 0 && (
                              <Badge className="h-5 min-w-[20px] text-xs">{conv.unread_count}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Messages panel */}
            <Card className={cn("md:col-span-2", !selectedUserId && "hidden md:flex md:items-center md:justify-center")}>
              {!selectedUserId ? (
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-8 w-8"
                        onClick={() => setSelectedUserId(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {selectedConvo?.full_name?.slice(0, 2).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-base">{selectedConvo?.full_name || "Chat"}</CardTitle>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !messages?.length ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => {
                          const isMine = msg.sender_id === user?.id;
                          return (
                            <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[75%] rounded-2xl px-4 py-2",
                                  isMine
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted rounded-bl-md"
                                )}
                              >
                                <p className="text-sm">{msg.content}</p>
                                <p className={cn("text-[10px] mt-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                  {format(new Date(msg.created_at), "HH:mm")}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="p-3 border-t">
                    <form onSubmit={handleSend} className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        maxLength={2000}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!messageText.trim() || sendMutation.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
        <LandingFooter />
      </div>
    </ProtectedRoute>
  );
};

export default Messages;
