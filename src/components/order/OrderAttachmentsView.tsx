import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Image, Box, Boxes, FileIcon, ExternalLink, Eye } from "lucide-react";
import { formatFileSize } from "@/lib/imageCompression";

interface OrderAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  attachment_category: string;
  created_at: string;
}

interface OrderAttachmentsViewProps {
  orderId: string;
  showTitle?: boolean;
}

const getCategoryIcon = (category: string, fileName?: string) => {
  switch (category) {
    case 'radiograph':
    case 'intraoral_photo':
      return <Image className="h-4 w-4" />;
    case 'stl':
      return <Box className="h-4 w-4" />;
    case 'obj':
      return <Boxes className="h-4 w-4" />;
    default:
      if (fileName?.toLowerCase().endsWith('.stl')) {
        return <Box className="h-4 w-4" />;
      } else if (fileName?.toLowerCase().endsWith('.obj')) {
        return <Boxes className="h-4 w-4" />;
      }
      return <FileIcon className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'radiograph': return 'Radiograph';
    case 'intraoral_photo': return 'Intraoral Photo';
    case 'stl': return 'STL Model';
    case 'obj': return 'OBJ Model';
    default: return category.replace('_', ' ');
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'radiograph': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'intraoral_photo': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'stl': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'obj': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

export function OrderAttachmentsView({ orderId, showTitle = true }: OrderAttachmentsViewProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['order-attachments', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_attachments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderAttachment[];
    },
    enabled: !!orderId
  });

  const downloadFile = async (attachment: OrderAttachment) => {
    setDownloadingId(attachment.id);
    try {
      const { data, error } = await supabase.storage
        .from('order-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${attachment.file_name}`);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error("Failed to download file", {
        description: error.message
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const viewFile = async (attachment: OrderAttachment) => {
    try {
      const { data } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(attachment.file_path);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error: any) {
      console.error('View error:', error);
      toast.error("Failed to view file");
    }
  };

  // Group attachments by category
  const groupedAttachments = attachments?.reduce((acc, att) => {
    const category = att.attachment_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(att);
    return acc;
  }, {} as Record<string, OrderAttachment[]>) || {};

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileIcon className="h-5 w-5" />
              Order Attachments
            </CardTitle>
            <CardDescription>Files uploaded by the doctor</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No attachments uploaded for this order
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="h-5 w-5" />
            Order Attachments ({attachments.length})
          </CardTitle>
          <CardDescription>
            Radiographs, 3D models, and photos uploaded by the doctor
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {Object.entries(groupedAttachments).map(([category, files]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <span className="text-sm font-medium">
                {getCategoryLabel(category)} ({files.length})
              </span>
            </div>
            <div className="space-y-2 pl-6">
              {files.map((attachment) => (
                <div 
                  key={attachment.id} 
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 flex items-center justify-center bg-primary/10 rounded">
                      {getCategoryIcon(attachment.attachment_category, attachment.file_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getCategoryColor(attachment.attachment_category)}`}
                        >
                          {getCategoryLabel(attachment.attachment_category)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {attachment.file_type.startsWith('image/') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewFile(attachment)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(attachment)}
                      disabled={downloadingId === attachment.id}
                      title="Download"
                    >
                      <Download className={`h-4 w-4 ${downloadingId === attachment.id ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
