import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action_type: string;
  table_name: string;
  created_at: string;
  user_id: string | null;
  metadata: any;
  ip_address: string | null;
}

const AdminActivityTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("create") || action.includes("insert")) {
      return <Badge className="bg-green-500">Create</Badge>;
    }
    if (action.includes("update")) {
      return <Badge className="bg-blue-500">Update</Badge>;
    }
    if (action.includes("delete")) {
      return <Badge className="bg-red-500">Delete</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  const exportLogs = async () => {
    const { exportToCSV, prepareActivityLogsForExport } = await import("@/lib/exportUtils");
    const exportData = prepareActivityLogsForExport(logs);
    exportToCSV(exportData, `activity-logs-${new Date().toISOString().split("T")[0]}`);
    toast.success("Activity logs exported successfully");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>
            Monitor all system actions and changes ({logs.length} recent entries)
          </CardDescription>
        </div>
        <Button onClick={exportLogs} variant="outline">
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>{getActionBadge(log.action_type)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {log.table_name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">
                      {log.user_id?.substring(0, 8) || "system"}...
                    </code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ip_address || "—"}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {log.metadata && (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-muted-foreground hover:text-foreground">
                          View metadata
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminActivityTab;
