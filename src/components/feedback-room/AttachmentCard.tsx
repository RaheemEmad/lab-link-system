import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileIcon, Download, MessageSquare, Eye, Send, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  category: string;
  created_at: string;
  uploaded_by: string;
  order_id: string;
  isOriginal?: boolean;
  uploader?: {
    full_name: string | null;
    email: string | null;
  };
}

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  user_role: string;
  is_resolved: boolean | null;
  user?: {
    full_name: string | null;
    email: string | null;
  };
}

interface AttachmentCardProps {
  attachment: Attachment;
}

const categoryColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  design: "bg-primary/10 text-primary",
  photos: "bg-green-500/10 text-green-600",
  xray: "bg-blue-500/10 text-blue-600",
  model: "bg-purple-500/10 text-purple-600",
};

const AttachmentCard = ({ attachment }: AttachmentCardProps) => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff } = useUserRole();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const isImage = attachment.file_type?.startsWith("image/");
  const uploaderName = attachment.uploader?.full_name || attachment.uploader?.email || "Unknown";
  const uploaderInitials = uploaderName.slice(0, 2).toUpperCase();
  const isOriginalPhoto = attachment.isOriginal === true;

  // Fetch comments for this attachment (only for non-original photos)
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["attachment-comments", attachment.id],
    queryFn: async () => {
      if (isOriginalPhoto) return [];
      
      const { data, error } = await supabase
        .from("feedback_room_comments")
        .select(`
          id,
          comment_text,
          created_at,
          user_id,
          user_role,
          is_resolved,
          user:profiles!feedback_room_comments_user_id_fkey(full_name, email)
        `)
        .eq("attachment_id", attachment.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: showComments && !isOriginalPhoto,
  });

  // Log activity for comments
  const logActivity = async (description: string) => {
    if (!user?.id || isOriginalPhoto) return;
    
    const userRole = isDoctor ? "doctor" : isLabStaff ? "lab_staff" : "unknown";
    
    try {
      await supabase.rpc("log_feedback_activity", {
        p_order_id: attachment.order_id,
        p_user_id: user.id,
        p_user_role: userRole,
        p_action_type: "comment_added",
        p_action_description: description,
        p_metadata: { attachment_id: attachment.id, file_name: attachment.file_name }
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (isOriginalPhoto) throw new Error("Cannot comment on original photos");

      const userRole = isDoctor ? "doctor" : isLabStaff ? "lab_staff" : "unknown";

      const { error } = await supabase
        .from("feedback_room_comments")
        .insert({
          order_id: attachment.order_id,
          attachment_id: attachment.id,
          user_id: user.id,
          user_role: userRole,
          comment_text: commentText,
        });

      if (error) throw error;
      return commentText;
    },
    onSuccess: (commentText) => {
      queryClient.invalidateQueries({ queryKey: ["attachment-comments", attachment.id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-comments", attachment.order_id] });
      queryClient.invalidateQueries({ queryKey: ["feedback-activity", attachment.order_id] });
      logActivity(`Commented on ${attachment.file_name}: "${commentText.substring(0, 50)}..."`);
      setNewComment("");
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error("Failed to add comment", { description: error.message });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(newComment.trim());
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "doctor":
        return "bg-blue-500/10 text-blue-600";
      case "lab_staff":
        return "bg-purple-500/10 text-purple-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${isOriginalPhoto ? 'border-primary/30' : ''}`}>
      <CardContent className="p-0">
        {/* Thumbnail / Preview */}
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {isImage ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                const icon = document.createElement('div');
                icon.innerHTML = '<svg class="h-16 w-16 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                e.currentTarget.parentElement?.appendChild(icon.firstChild!);
              }}
            />
          ) : (
            <FileIcon className="h-16 w-16 text-muted-foreground" />
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {isOriginalPhoto && (
              <Badge className="bg-primary/80 text-primary-foreground text-xs">
                <ImageIcon className="h-3 w-3 mr-1" />
                Original
              </Badge>
            )}
            <Badge
              className={`${categoryColors[attachment.category] || categoryColors.general}`}
            >
              {attachment.category}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* File Name */}
          <div>
            <p className="font-medium text-sm truncate" title={attachment.file_name}>
              {attachment.file_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>

          {/* Uploader Info */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {uploaderInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{uploaderName}</p>
              <p className="text-xs text-muted-foreground">
                {isOriginalPhoto ? "Order submission" : formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                <Eye className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={attachment.file_url} download={attachment.file_name}>
                <Download className="h-3 w-3 mr-1" />
                Download
              </a>
            </Button>
          </div>

          {/* Comments Section - Only for non-original photos */}
          {!isOriginalPhoto && (
            <Collapsible open={showComments} onOpenChange={setShowComments}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Comments {comments && comments.length > 0 && `(${comments.length})`}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                {/* Comments List */}
                <ScrollArea className="max-h-48">
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments && comments.length > 0 ? (
                    <div className="space-y-2 pr-2">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-2 bg-muted/50 rounded-lg text-sm space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {(comment.user?.full_name || comment.user?.email || "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">
                              {comment.user?.full_name || comment.user?.email || "Unknown"}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1 py-0 ${getRoleBadgeColor(comment.user_role)}`}
                            >
                              {comment.user_role === "doctor" ? "Doctor" : "Lab"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-7">
                            {comment.comment_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </ScrollArea>

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || addComment.isPending}
                  >
                    {addComment.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3 mr-1" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttachmentCard;
