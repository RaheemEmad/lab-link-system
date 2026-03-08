import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00",
];

interface SlotRow {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  max_bookings: number;
}

export const AvailabilityManager = () => {
  const { labId } = useUserRole();
  const queryClient = useQueryClient();
  const [newDay, setNewDay] = useState<number>(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["lab-availability", labId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_availability_slots")
        .select("*")
        .eq("lab_id", labId!)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data as SlotRow[];
    },
    enabled: !!labId,
    staleTime: 30_000,
  });

  const addSlot = useMutation({
    mutationFn: async () => {
      if (!labId) throw new Error("No lab");
      const { error } = await supabase.from("lab_availability_slots").insert({
        lab_id: labId,
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
        max_bookings: 1,
      });
      if (error) {
        if (error.code === "23505") throw new Error("This time slot already exists");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-availability", labId] });
      toast.success("Availability slot added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleSlot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("lab_availability_slots")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab-availability", labId] }),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lab_availability_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-availability", labId] });
      toast.success("Slot removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Group by day
  const grouped = DAYS.map((name, i) => ({
    name,
    dayIndex: i,
    slots: slots.filter((s) => s.day_of_week === i),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Availability Schedule
        </CardTitle>
        <CardDescription>Set your weekly availability for pickups and deliveries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new slot */}
        <div className="flex flex-wrap items-end gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Day</Label>
            <Select value={String(newDay)} onValueChange={(v) => setNewDay(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Select value={newStart} onValueChange={setNewStart}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Select value={newEnd} onValueChange={setNewEnd}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.filter((t) => t > newStart).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => addSlot.mutate()} disabled={addSlot.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Weekly grid */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((day) => (
              <div key={day.dayIndex} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm w-24">{day.name}</span>
                  {day.slots.length === 0 && (
                    <span className="text-xs text-muted-foreground">No slots configured</span>
                  )}
                </div>
                {day.slots.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-24">
                    {day.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm",
                          slot.is_active ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-muted opacity-60"
                        )}
                      >
                        <span>{slot.start_time} – {slot.end_time}</span>
                        <Switch
                          checked={slot.is_active}
                          onCheckedChange={(checked) => toggleSlot.mutate({ id: slot.id!, is_active: checked })}
                          className="scale-75"
                        />
                        <button
                          onClick={() => deleteSlot.mutate(slot.id!)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
