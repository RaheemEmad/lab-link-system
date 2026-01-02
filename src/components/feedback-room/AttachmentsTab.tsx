import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AttachmentUploader from "./AttachmentUploader";
import AttachmentCard from "./AttachmentCard";

interface AttachmentsTabProps {
  orderId: string;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "design", label: "Design" },
  { value: "photos", label: "Photos" },
  { value: "xray", label: "X-Ray" },
  { value: "model", label: "Model" },
];

const AttachmentsTab = ({ orderId }: AttachmentsTabProps) => {
  const [showUploader, setShowUploader] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: attachments, isLoading, refetch } = useQuery({
    queryKey: ["feedback-attachments", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback_room_attachments")
        .select(`
          *,
          uploader:profiles!feedback_room_attachments_uploaded_by_fkey(full_name, email)
        `)
        .eq("order_id", orderId)
        .eq("is_latest", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching attachments:", error);
        throw error;
      }
      return data;
    },
    enabled: !!orderId,
  });

  const filteredAttachments = attachments?.filter(
    (a) => categoryFilter === "all" || a.category === categoryFilter
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading attachments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Upload Files</CardTitle>
            <Button
              variant={showUploader ? "secondary" : "default"}
              size="sm"
              onClick={() => setShowUploader(!showUploader)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {showUploader ? "Hide Uploader" : "Upload"}
            </Button>
          </div>
        </CardHeader>
        {showUploader && (
          <CardContent>
            <AttachmentUploader
              orderId={orderId}
              onUploadComplete={() => {
                refetch();
                setShowUploader(false);
              }}
            />
          </CardContent>
        )}
      </Card>

      {/* Filter & Attachments List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Attachments
              {attachments && attachments.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({attachments.length})
                </span>
              )}
            </CardTitle>
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="h-8">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="text-xs px-2 h-6">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredAttachments || filteredAttachments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No attachments yet</p>
              <p className="text-sm">Upload files to start collaborating</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttachments.map((attachment) => (
                <AttachmentCard key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttachmentsTab;
