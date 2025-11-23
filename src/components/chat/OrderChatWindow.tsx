import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Paperclip, Download, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  is_ai_generated: boolean;
  created_at: string;
  read_at?: string;
  read_by?: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
}

interface OrderChatWindowProps {
  orderId: string;
  orderNumber: string;
  currentUserRole: 'doctor' | 'lab_staff';
  onClose: () => void;
}

export const OrderChatWindow: React.FC<OrderChatWindowProps> = ({
  orderId,
  orderNumber,
  currentUserRole,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const messageSound = useRef<HTMLAudioElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [retryQueue, setRetryQueue] = useState<Map<string, { message: string; retries: number }>>(new Map());

  useEffect(() => {
    // Create notification sound
    messageSound.current = new Audio('/sounds/achievement-unlock.mp3');
    messageSound.current.volume = 0.3;

    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Play sound if message is from other user
          if (newMessage.sender_id !== currentUserId && messageSound.current) {
            messageSound.current.play().catch(console.error);
          }
          
          // Mark as read
          markMessageAsRead(newMessage.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_typing_indicators',
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload.new?.user_id !== currentUserId) {
            setOtherUserTyping(payload.new?.is_typing || false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [orderId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, otherUserTyping]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
      return;
    }

    setMessages(data || []);
    
    // Mark unread messages as read
    data?.forEach((msg) => {
      if (!msg.read_at && msg.sender_id !== currentUserId) {
        markMessageAsRead(msg.id);
      }
    });
  };

  const markMessageAsRead = async (messageId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase
      .from('chat_messages')
      .update({
        read_at: new Date().toISOString(),
        read_by: userData.user.id,
      })
      .eq('id', messageId)
      .is('read_at', null);
  };

  const updateTypingStatus = async (typing: boolean) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase
      .from('chat_typing_indicators')
      .upsert({
        order_id: orderId,
        user_id: userData.user.id,
        is_typing: typing,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'order_id,user_id',
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Update typing indicator
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFile(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send message with attachment
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId,
          sender_id: userData.user.id,
          sender_role: currentUserRole,
          message_text: `Shared a file: ${file.name}`,
          is_ai_generated: false,
          attachment_url: urlData.publicUrl,
          attachment_type: file.type,
          attachment_name: file.name,
          attachment_size: file.size,
        });

      if (insertError) throw insertError;

      toast({
        title: 'File shared',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = async (retryAttempt = 0) => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    const tempMessageId = `temp_${Date.now()}`;
    setInputMessage('');
    setIsLoading(true);
    updateTypingStatus(false);
    setIsTyping(false);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          order_id: orderId,
          sender_id: userData.user.id,
          sender_role: currentUserRole,
          message_text: messageText,
          is_ai_generated: false,
        });

      if (insertError) {
        // Retry with exponential backoff
        if (retryAttempt < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
          console.log(`Retrying message send in ${delay}ms (attempt ${retryAttempt + 1})`);
          
          toast({
            title: 'Retrying...',
            description: `Attempting to send message (${retryAttempt + 1}/3)`,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          setInputMessage(messageText);
          setIsLoading(false);
          return handleSendMessage(retryAttempt + 1);
        }
        throw insertError;
      }

      await streamAIResponse(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (retryAttempt >= 3) {
        // Restore message for manual retry
        setInputMessage(messageText);
      }
      
      toast({
        title: retryAttempt >= 3 ? 'Message Failed' : 'Error',
        description: retryAttempt >= 3 
          ? 'Failed to send after 3 attempts. Message restored for manual retry.' 
          : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const streamAIResponse = async (userMessage: string) => {
    try {
      setStreamingMessage('');
      
      const chatMessages = messages.map((msg) => ({
        role: msg.is_ai_generated ? 'assistant' : 'user',
        content: msg.message_text,
      }));
      
      chatMessages.push({ role: 'user', content: userMessage });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: chatMessages,
            orderId,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              setStreamingMessage(fullResponse);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (fullResponse) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        await supabase.from('chat_messages').insert({
          order_id: orderId,
          sender_id: userData.user.id,
          sender_role: currentUserRole,
          message_text: fullResponse,
          is_ai_generated: true,
        });
      }

      setStreamingMessage('');
    } catch (error) {
      console.error('Error streaming AI response:', error);
      setStreamingMessage('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getReadReceiptIcon = (msg: Message) => {
    if (msg.sender_id === currentUserId) {
      if (msg.read_at) {
        return <CheckCheck className="h-3 w-3 text-primary" />;
      }
      return <Check className="h-3 w-3 text-muted-foreground" />;
    }
    return null;
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-2xl z-50 border-2 border-primary/20">
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div>
          <h3 className="font-semibold">Chat - Order {orderNumber}</h3>
          <p className="text-xs opacity-90">Real-time communication</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_role === currentUserRole ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.is_ai_generated
                    ? 'bg-accent text-accent-foreground'
                    : msg.sender_role === currentUserRole
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.is_ai_generated && (
                  <div className="text-xs font-semibold mb-1 opacity-70">AI Assistant</div>
                )}
                
                {msg.attachment_url && (
                  <div className="mb-2 p-2 bg-background/10 rounded flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{msg.attachment_name}</p>
                      <p className="text-xs opacity-70">{formatFileSize(msg.attachment_size || 0)}</p>
                    </div>
                    <a
                      href={msg.attachment_url}
                      download={msg.attachment_name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                )}
                
                <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                  {getReadReceiptIcon(msg)}
                </div>
              </div>
            </div>
          ))}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-accent text-accent-foreground">
                <div className="text-xs font-semibold mb-1 opacity-70">AI Assistant</div>
                <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                <Loader2 className="h-3 w-3 animate-spin mt-1" />
              </div>
            </div>
          )}

          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx"
        />
        
        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};