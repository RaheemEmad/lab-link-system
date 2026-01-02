import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileIcon, ImageIcon, Download, MessageSquare, ThumbsUp, Eye, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  category: string;
  created_at: string;
  uploaded_by: string;
  uploader?: {
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
  const [showComments, setShowComments] = useState(false);
  const isImage = attachment.file_type?.startsWith("image/");
  const uploaderName = attachment.uploader?.full_name || attachment.uploader?.email || "Unknown";
  const uploaderInitials = uploaderName.slice(0, 2).toUpperCase();

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Thumbnail / Preview */}
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {isImage ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FileIcon className="h-16 w-16 text-muted-foreground" />
          )}
          <Badge
            className={`absolute top-2 right-2 ${categoryColors[attachment.category] || categoryColors.general}`}
          >
            {attachment.category}
          </Badge>
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
                {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
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

          {/* Comments Toggle */}
          <Collapsible open={showComments} onOpenChange={setShowComments}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <MessageSquare className="h-3 w-3 mr-1" />
                Comments
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                No comments yet
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttachmentCard;
