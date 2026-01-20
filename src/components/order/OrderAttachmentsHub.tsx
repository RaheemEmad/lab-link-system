import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Image, 
  MessageSquare, 
  Paperclip, 
  ExternalLink, 
  Download,
  Loader2,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  FileCheck,
  Info
} from "lucide-react";
import { format } from "date-fns";

interface OrderAttachmentsHubProps {
  orderId: string;
  order: {
    biological_notes?: string | null;
    handling_instructions?: string | null;
    approval_notes?: string | null;
    photos_link?: string | null;
  };
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  attachment_category: string;
  created_at: string;
  uploaded_by: string;
  uploader?: { full_name: string } | null;
}

interface OrderNote {
  id: string;
  note_text: string;
  created_at: string;
  user_id: string;
  user?: { full_name: string } | null;
}

export const OrderAttachmentsHub = ({ orderId, order }: OrderAttachmentsHubProps) => {
  const [activeTab, setActiveTab] = useState("all");

  // Fetch attachments
  const { data: attachments, isLoading: attachmentsLoading } = useQuery({
    queryKey: ['order-attachments', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_attachments')
        .select(`
          *,
          uploader:profiles!order_attachments_uploaded_by_fkey(full_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Attachment[];
    }
  });

  // Fetch order notes
  const { data: orderNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['order-notes', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_notes')
        .select(`
          *,
          user:profiles!order_notes_user_id_fkey(full_name)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as OrderNote[];
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith('image/');

  const hasPhotosLink = !!order.photos_link;
  const hasBioNotes = !!order.biological_notes;
  const hasHandlingNotes = !!order.handling_instructions;
  const hasApprovalNotes = !!order.approval_notes;
  const hasLabNotes = (orderNotes?.length || 0) > 0;
  const hasAttachments = (attachments?.length || 0) > 0;

  const totalItems = 
    (hasPhotosLink ? 1 : 0) + 
    (hasBioNotes ? 1 : 0) + 
    (hasHandlingNotes ? 1 : 0) +
    (hasApprovalNotes ? 1 : 0) +
    (orderNotes?.length || 0) + 
    (attachments?.length || 0);

  const isLoading = attachmentsLoading || notesLoading;

  const NoteCard = ({ 
    icon: Icon, 
    title, 
    content, 
    variant = "default" 
  }: { 
    icon: React.ElementType; 
    title: string; 
    content: string;
    variant?: "default" | "warning" | "success";
  }) => {
    const bgColor = variant === "warning" 
      ? "bg-yellow-500/10 border-yellow-500/30" 
      : variant === "success"
        ? "bg-green-500/10 border-green-500/30"
        : "bg-muted/50 border-muted";
    
    return (
      <div className={`rounded-lg border p-3 sm:p-4 ${bgColor}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              {title}
            </p>
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            Order Attachments
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {isLoading ? '...' : totalItems} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
            <TabsList className="w-max sm:w-full">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm">Notes</TabsTrigger>
              <TabsTrigger value="files" className="text-xs sm:text-sm">Files</TabsTrigger>
              <TabsTrigger value="photos" className="text-xs sm:text-sm">Photos</TabsTrigger>
            </TabsList>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No attachments found</p>
              <p className="text-sm">Notes and files will appear here</p>
            </div>
          ) : (
            <>
              {/* All Tab */}
              <TabsContent value="all" className="mt-0">
                <ScrollArea className="h-[350px] sm:h-[400px] pr-3">
                  <div className="space-y-4">
                    {/* Doctor Notes Section */}
                    {(hasBioNotes || hasHandlingNotes || hasApprovalNotes) && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Doctor Notes
                        </h4>
                        <div className="space-y-2">
                          {hasBioNotes && (
                            <NoteCard 
                              icon={FileText}
                              title="Biological Notes"
                              content={order.biological_notes!}
                            />
                          )}
                          {hasHandlingNotes && (
                            <NoteCard 
                              icon={AlertCircle}
                              title="Handling Instructions"
                              content={order.handling_instructions!}
                              variant="warning"
                            />
                          )}
                          {hasApprovalNotes && (
                            <NoteCard 
                              icon={FileCheck}
                              title="Approval Notes"
                              content={order.approval_notes!}
                              variant="success"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lab/Team Notes Section */}
                    {hasLabNotes && (
                      <>
                        {(hasBioNotes || hasHandlingNotes || hasApprovalNotes) && <Separator />}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <FlaskConical className="h-4 w-4" />
                            Team Notes
                          </h4>
                          <div className="space-y-2">
                            {orderNotes?.map(note => (
                              <div key={note.id} className="rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">
                                      {note.user?.full_name || 'Team Member'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Photos Link Section */}
                    {hasPhotosLink && (
                      <>
                        {(hasBioNotes || hasHandlingNotes || hasApprovalNotes || hasLabNotes) && <Separator />}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            External Photos
                          </h4>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            asChild
                          >
                            <a 
                              href={order.photos_link!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Photos (External Link)
                            </a>
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Uploaded Attachments Section */}
                    {hasAttachments && (
                      <>
                        {(hasBioNotes || hasHandlingNotes || hasApprovalNotes || hasLabNotes || hasPhotosLink) && <Separator />}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Uploaded Files
                          </h4>
                          <div className="grid gap-2">
                            {attachments?.map(file => (
                              <div 
                                key={file.id} 
                                className="flex items-center gap-3 p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                              >
                                {isImage(file.file_type) ? (
                                  <Image className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.file_size)} • {file.attachment_category}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-0">
                <ScrollArea className="h-[350px] sm:h-[400px] pr-3">
                  <div className="space-y-3">
                    {hasBioNotes && (
                      <NoteCard 
                        icon={FileText}
                        title="Biological Notes"
                        content={order.biological_notes!}
                      />
                    )}
                    {hasHandlingNotes && (
                      <NoteCard 
                        icon={AlertCircle}
                        title="Handling Instructions"
                        content={order.handling_instructions!}
                        variant="warning"
                      />
                    )}
                    {hasApprovalNotes && (
                      <NoteCard 
                        icon={FileCheck}
                        title="Approval Notes"
                        content={order.approval_notes!}
                        variant="success"
                      />
                    )}
                    {orderNotes?.map(note => (
                      <div key={note.id} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {note.user?.full_name || 'Team Member'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(note.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                      </div>
                    ))}
                    {!hasBioNotes && !hasHandlingNotes && !hasApprovalNotes && !hasLabNotes && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notes found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="mt-0">
                <ScrollArea className="h-[350px] sm:h-[400px] pr-3">
                  <div className="space-y-2">
                    {attachments?.filter(f => !isImage(f.file_type)).map(file => (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                      >
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)} • {format(new Date(file.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                    {(!attachments || attachments.filter(f => !isImage(f.file_type)).length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files uploaded</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="mt-0">
                <ScrollArea className="h-[350px] sm:h-[400px] pr-3">
                  <div className="space-y-4">
                    {hasPhotosLink && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <a 
                          href={order.photos_link!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View External Photos Link
                        </a>
                      </Button>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attachments?.filter(f => isImage(f.file_type)).map(file => (
                        <div 
                          key={file.id} 
                          className="aspect-square rounded-lg border bg-muted/50 overflow-hidden relative group"
                        >
                          <img 
                            src={file.file_path}
                            alt={file.file_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!hasPhotosLink && (!attachments || attachments.filter(f => isImage(f.file_type)).length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No photos found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderAttachmentsHub;
