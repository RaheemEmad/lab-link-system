import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { MessageSquare, ThumbsUp, Search } from "lucide-react";

interface Note {
  id: string;
  note_text: string;
  created_at: string;
  user_id: string;
  order_id: string;
  order_number: string;
  author_name: string;
  likes_count: number;
}

const AdminCommunicationTab = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      
      // Fetch notes with order information and author details
      const { data: notesData, error: notesError } = await supabase
        .from("order_notes")
        .select(`
          id,
          note_text,
          created_at,
          user_id,
          order_id,
          orders!inner(order_number),
          profiles!inner(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (notesError) throw notesError;

      // Fetch like counts for each note
      const notesWithLikes = await Promise.all(
        (notesData || []).map(async (note: any) => {
          const { count } = await supabase
            .from("note_likes")
            .select("*", { count: "exact", head: true })
            .eq("note_id", note.id);

          return {
            id: note.id,
            note_text: note.note_text,
            created_at: note.created_at,
            user_id: note.user_id,
            order_id: note.order_id,
            order_number: note.orders.order_number,
            author_name: note.profiles.full_name || note.profiles.email,
            likes_count: count || 0,
          };
        })
      );

      setNotes(notesWithLikes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load communication logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter((note) =>
    note.note_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <CardHeader>
        <CardTitle>Communication Monitor</CardTitle>
        <CardDescription>
          View all notes and comments between dentists and labs ({notes.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, author, or note content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(note.created_at), "MMM dd, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{note.order_number}</Badge>
                  </TableCell>
                  <TableCell>{note.author_name}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm line-clamp-2">{note.note_text}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {note.likes_count > 0 && (
                      <div className="flex items-center justify-end gap-1 text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        <span className="text-sm">{note.likes_count}</span>
                      </div>
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

export default AdminCommunicationTab;
