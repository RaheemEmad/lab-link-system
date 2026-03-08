import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Clock,
  Plus,
  MapPin,
  CheckCircle2,
  XCircle,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: string;
  order_id: string;
  appointment_type: string;
  scheduled_date: string;
  time_slot_start: string;
  time_slot_end: string;
  location_address: string | null;
  location_notes: string | null;
  status: string;
  created_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  order?: { order_number: string; patient_name: string } | null;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00",
];

const AppointmentScheduling = () => {
  const { user } = useAuth();
  const { isDoctor, isLabStaff, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Form state
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [appointmentType, setAppointmentType] = useState<string>("pickup");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("10:00");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch user's appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, order:orders(order_number, patient_name)")
        .order("scheduled_date", { ascending: true })
        .order("time_slot_start", { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Fetch orders for selection (active orders only) - include assigned_lab_id
  const { data: userOrders = [] } = useQuery({
    queryKey: ["appointment-orders", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("id, order_number, patient_name, assigned_lab_id")
        .not("status", "in", '("Cancelled","Delivered")')
        .order("created_at", { ascending: false })
        .limit(50);

      if (isDoctor) {
        query = query.eq("doctor_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Get the selected order's assigned lab
  const selectedOrder = userOrders.find((o) => o.id === selectedOrderId);
  const selectedLabId = selectedOrder?.assigned_lab_id;

  // Fetch lab availability slots for selected order's lab
  const { data: labAvailability = [] } = useQuery({
    queryKey: ["lab-availability-for-booking", selectedLabId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_availability_slots")
        .select("*")
        .eq("lab_id", selectedLabId!)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedLabId,
    staleTime: 30_000,
  });

  // Available days of week from lab slots
  const availableDays = new Set(labAvailability.map((s) => s.day_of_week));
  const hasAvailability = labAvailability.length > 0;

  // Filter time slots based on lab availability for the selected date
  const availableTimeSlots = selectedDate && hasAvailability
    ? labAvailability
        .filter((s) => s.day_of_week === selectedDate.getDay())
        .flatMap((s) => {
          const slots: string[] = [];
          const start = s.start_time.slice(0, 5);
          const end = s.end_time.slice(0, 5);
          for (const t of TIME_SLOTS) {
            if (t >= start && t < end) slots.push(t);
          }
          return slots;
        })
    : TIME_SLOTS;

  const createAppointment = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedOrderId || !user) throw new Error("Missing required fields");

      const { error } = await supabase.from("appointments").insert({
        order_id: selectedOrderId,
        appointment_type: appointmentType,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        time_slot_start: timeStart,
        time_slot_end: timeEnd,
        location_address: locationAddress || null,
        location_notes: locationNotes || null,
        notes: notes || null,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment scheduled");
      setCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to schedule", { description: error.message });
    },
  });

  const confirmAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed", confirmed_by: user!.id, confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment confirmed");
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment cancelled");
    },
  });

  const resetForm = () => {
    setSelectedOrderId("");
    setAppointmentType("pickup");
    setSelectedDate(undefined);
    setTimeStart("09:00");
    setTimeEnd("10:00");
    setLocationAddress("");
    setLocationNotes("");
    setNotes("");
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "cancelled": return "bg-destructive/10 text-destructive";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-primary/10 text-primary";
    }
  };

  if (roleLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  const upcomingAppointments = appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const pastAppointments = appointments.filter((a) => a.status === "cancelled" || a.status === "completed");

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
          <div className="container px-3 sm:px-4 lg:px-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                  <Truck className="h-6 w-6 text-primary" />
                  Appointment Scheduling
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Schedule pickup and delivery windows for your orders
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Appointment
              </Button>
            </div>

            {/* Upcoming */}
            <div className="mb-8">
              <h2 className="font-semibold text-lg mb-3">Upcoming ({upcomingAppointments.length})</h2>
              {isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>)}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">No upcoming appointments</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcomingAppointments.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      statusColor={statusColor}
                      onConfirm={() => confirmAppointment.mutate(appt.id)}
                      onCancel={() => setCancelTarget(appt.id)}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Past */}
            {pastAppointments.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3 text-muted-foreground">Past ({pastAppointments.length})</h2>
                <div className="grid gap-3 sm:grid-cols-2 opacity-60">
                  {pastAppointments.slice(0, 6).map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      statusColor={statusColor}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Order *</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                  <SelectContent>
                    {userOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        #{o.order_number} — {o.patient_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={appointmentType} onValueChange={setAppointmentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          if (date < new Date()) return true;
                          if (hasAvailability && !availableDays.has(date.getDay())) return true;
                          return false;
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select value={timeStart} onValueChange={setTimeStart}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select value={timeEnd} onValueChange={setTimeEnd}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.filter((t) => t > timeStart).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location Address</Label>
                <Input
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Clinic/lab address for pickup or delivery"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions for pickup/delivery..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createAppointment.mutate()}
                disabled={!selectedOrderId || !selectedDate || createAppointment.isPending}
              >
                {createAppointment.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation */}
        <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
              <AlertDialogDescription>The other party will be notified.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (cancelTarget) cancelAppointment.mutate(cancelTarget);
                  setCancelTarget(null);
                }}
              >
                Cancel Appointment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
};

// --- Appointment Card ---
const AppointmentCard = ({
  appointment,
  statusColor,
  onConfirm,
  onCancel,
  currentUserId,
}: {
  appointment: Appointment;
  statusColor: (s: string) => string;
  onConfirm?: () => void;
  onCancel?: () => void;
  currentUserId?: string;
}) => {
  const order = appointment.order as any;
  const canConfirm = appointment.status === "scheduled" && appointment.created_by !== currentUserId;
  const canCancel = appointment.status !== "cancelled" && appointment.status !== "completed";

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">
              {order?.order_number ? `#${order.order_number}` : "Order"} — {order?.patient_name || ""}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{appointment.appointment_type}</p>
          </div>
          <Badge className={cn("text-xs", statusColor(appointment.status))}>
            {appointment.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{format(new Date(appointment.scheduled_date), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{appointment.time_slot_start} – {appointment.time_slot_end}</span>
          </div>
        </div>

        {appointment.location_address && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{appointment.location_address}</span>
          </div>
        )}

        {(canConfirm || canCancel) && (
          <div className="flex gap-2 pt-1">
            {canConfirm && onConfirm && (
              <Button size="sm" variant="outline" className="text-xs" onClick={onConfirm}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
              </Button>
            )}
            {canCancel && onCancel && (
              <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={onCancel}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentScheduling;
