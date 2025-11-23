import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAllDrafts, deleteDraft, deleteAllDrafts } from "@/hooks/useDraftCleanup";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DraftsManager() {
  const [drafts, setDrafts] = useState(getAllDrafts());
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshDrafts = () => {
    setDrafts(getAllDrafts());
    toast({
      title: "Refreshed",
      description: "Draft list has been updated.",
    });
  };

  const handleDeleteDraft = (key: string) => {
    const success = deleteDraft(key);
    if (success) {
      setDrafts(getAllDrafts());
      toast({
        title: "Draft Deleted",
        description: "The draft has been removed.",
      });
    }
  };

  const handleDeleteAll = () => {
    setIsDeleting(true);
    const count = deleteAllDrafts();
    setDrafts([]);
    setIsDeleting(false);
    
    toast({
      title: "All Drafts Deleted",
      description: `Removed ${count} draft(s) from storage.`,
    });
  };

  const getDraftType = (key: string): string => {
    if (key.includes('order-form')) return 'New Order';
    if (key.includes('edit-order')) return 'Edit Order';
    if (key.includes('profile')) return 'Profile';
    if (key.includes('order-note')) return 'Order Note';
    if (key.includes('status-update')) return 'Status Update';
    if (key.includes('shipment')) return 'Shipment Details';
    if (key.includes('lab-response')) return 'Lab Response';
    return 'Unknown';
  };

  const getDraftVariant = (type: string): "default" | "secondary" | "outline" => {
    if (type.includes('Order')) return 'default';
    if (type.includes('Profile')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Draft Manager</h1>
            <p className="text-lg text-muted-foreground">
              View and manage all your autosaved drafts
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshDrafts}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {drafts.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Drafts?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {drafts.length} draft(s). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {drafts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">No Drafts Found</h2>
              <p className="text-muted-foreground">
                Your autosaved drafts will appear here when you start filling out forms.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {drafts.map((draft, index) => {
              const draftType = getDraftType(draft.key);
              
              return (
                <Card key={draft.key} className="hover-lift">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{draftType}</CardTitle>
                          <Badge variant={getDraftVariant(draftType)}>
                            {draftType}
                          </Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">Saved:</span>
                            <span>{draft.age}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{draft.timestamp.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">Storage Key:</span>
                            <code className="text-xs bg-muted px-1 rounded">{draft.key}</code>
                          </div>
                        </CardDescription>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this {draftType.toLowerCase()} draft. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteDraft(draft.key)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted p-4 overflow-auto max-h-48">
                      <pre className="text-xs">
                        {JSON.stringify(draft.data, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Separator />

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">About Draft Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              • Drafts are automatically saved to your browser's local storage as you type
            </p>
            <p>
              • Drafts older than 7 days are automatically cleaned up on page load
            </p>
            <p>
              • Successfully submitted forms automatically clear their drafts
            </p>
            <p>
              • Drafts are stored locally and are not synced across devices
            </p>
            <p>
              • Clearing your browser data will remove all drafts
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
