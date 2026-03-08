import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MessageSquare, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderChatWindow } from '@/components/chat/OrderChatWindow';

interface ChatConversation {
  order_id: string;
  order_number: string;
  patient_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  total_messages: number;
}

const PAGE_SIZE = 50;

export default function ChatHistory() {
  const { user } = useAuth();
  const { role, labId } = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [page, setPage] = useState(0);

  const currentUserRole: 'doctor' | 'lab_staff' = role === 'lab_staff' ? 'lab_staff' : 'doctor';

  // Fetch chat conversations with pagination
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['chat-conversations', user?.id, role, labId, page],
    queryFn: async () => {
      if (!user?.id) return [];

      // Paginated query — fetch PAGE_SIZE messages at a time
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          order_id,
          message_text,
          created_at,
          read_at,
          sender_id,
          orders (
            order_number,
            patient_name,
            doctor_id,
            assigned_lab_id
          )
        `)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      // Group messages by order
      const conversationsMap = new Map<string, ChatConversation>();

      messagesData?.forEach((msg: any) => {
        const order = msg.orders;
        if (!order) return;

        // Check access using already-fetched role
        const hasAccess =
          order.doctor_id === user.id ||
          (role === 'lab_staff' && order.assigned_lab_id === labId);

        if (!hasAccess) return;

        const orderId = msg.order_id;
        const existing = conversationsMap.get(orderId);

        if (!existing) {
          conversationsMap.set(orderId, {
            order_id: orderId,
            order_number: order.order_number,
            patient_name: order.patient_name,
            last_message: msg.message_text,
            last_message_at: msg.created_at,
            unread_count: !msg.read_at && msg.sender_id !== user.id ? 1 : 0,
            total_messages: 1,
          });
        } else {
          existing.total_messages++;
          if (!msg.read_at && msg.sender_id !== user.id) {
            existing.unread_count++;
          }
        }
      });

      return Array.from(conversationsMap.values()).sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );
    },
    enabled: !!user?.id && !!role,
    staleTime: 30_000,
  });

  // Filter conversations based on search
  const filteredConversations = conversations?.filter(
    (conv) =>
      conv.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasMore = (conversations?.length ?? 0) >= PAGE_SIZE;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-6xl">
            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Chat History</h1>
              <p className="text-muted-foreground">
                View all your past conversations with labs and doctors
              </p>
            </div>

            {/* Search */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, patient name, or message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Conversations List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : !filteredConversations || filteredConversations.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-base sm:text-lg font-medium mb-2">No conversations found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Start a conversation by accepting an order'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {filteredConversations.map((conv) => (
                    <Card
                      key={conv.order_id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() =>
                        setSelectedChat({
                          orderId: conv.order_id,
                          orderNumber: conv.order_number,
                        })
                      }
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              Order {conv.order_number}
                              {conv.unread_count > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                  {conv.unread_count} unread
                                </Badge>
                              )}
                            </CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {conv.patient_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(conv.last_message_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {conv.total_messages} messages
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {conv.last_message}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {page + 1}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        <LandingFooter />
      </div>

      {selectedChat && (
        <OrderChatWindow
          orderId={selectedChat.orderId}
          orderNumber={selectedChat.orderNumber}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </ProtectedRoute>
  );
}
