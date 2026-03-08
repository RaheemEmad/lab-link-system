import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientCases, PatientCase } from "@/hooks/usePatientCases";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLayout from "@/components/layouts/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Search,
  RefreshCw,
  Trash2,
  Users,
  FolderOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  ExternalLink,
} from "lucide-react";
import { CasePhotoUploader } from "@/components/patient-cases/CasePhotoUploader";
import { format } from "date-fns";

const PatientCases = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDoctor, isLoading: roleLoading, roleConfirmed } = useUserRole();
  const { cases, isLoading, deleteCase } = usePatientCases();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [photoCase, setPhotoCase] = useState<PatientCase | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [ordersCase, setOrdersCase] = useState<PatientCase | null>(null);
  const [caseOrders, setCaseOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const openLightbox = useCallback((photos: string[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxPhotos([]);
    setLightboxIndex(0);
  }, []);

  useEffect(() => {
    if (!lightboxPhotos.length) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min(i + 1, lightboxPhotos.length - 1));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxPhotos, closeLightbox]);

  const openOrdersDialog = useCallback(async (c: PatientCase) => {
    setOrdersCase(c);
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, restoration_type, patient_name")
        .eq("doctor_id", user!.id)
        .eq("patient_name", c.patient_name)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCaseOrders(data ?? []);
    } catch {
      setCaseOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.patient_name.toLowerCase().includes(q) ||
        c.restoration_type.toLowerCase().includes(q) ||
        c.teeth_shade.toLowerCase().includes(q)
    );
  }, [cases, searchQuery]);

  const handleReorder = (c: PatientCase) => {
    const params = new URLSearchParams({
      patientName: c.patient_name,
      restorationType: c.restoration_type,
      teethNumber: c.teeth_number,
      teethShade: c.teeth_shade,
      ...(c.shade_system && { shadeSystem: c.shade_system }),
      ...(c.biological_notes && { biologicalNotes: c.biological_notes }),
      ...(c.preferred_lab_id && { assignedLabId: c.preferred_lab_id }),
    });
    navigate(`/new-order?${params.toString()}`);
  };

  if (roleLoading || !roleConfirmed) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!isDoctor) {
    return (
      <ProtectedRoute>
        <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-5xl">
          <div className="flex-1 flex items-center justify-center py-16">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">Doctor Access Only</h2>
                <p className="text-muted-foreground">This feature is available for doctors.</p>
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageLayout bgClass="bg-secondary/30" maxWidth="max-w-5xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">Patient Case Library</h1>
          <p className="text-muted-foreground text-sm">
            View past patient cases and quickly reorder similar work
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, restoration, shade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-48" />
              </Card>
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold text-lg mb-1">
                {searchQuery ? "No matching cases" : "No patient cases yet"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {searchQuery
                  ? "Try a different search term."
                  : "Cases are automatically saved when you confirm delivery of an order."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCases.map((c) => (
              <Card key={c.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{c.patient_name}</CardTitle>
                      <CardDescription className="mt-0.5">
                        {c.order_count} order{c.order_count !== 1 ? "s" : ""}
                        {c.last_order && (
                          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                            {c.last_order.status}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {c.restoration_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {c.photos.length > 0 && (
                    <div className="flex gap-1.5 overflow-hidden">
                      {c.photos.slice(0, 3).map((url, idx) => (
                        <button
                          key={url}
                          onClick={() => openLightbox(c.photos, idx)}
                          className="h-12 w-12 rounded-md overflow-hidden border bg-muted shrink-0 hover:ring-2 ring-primary transition-all"
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                      {c.photos.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center ml-1">
                          +{c.photos.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Teeth:</span>{" "}
                      <span className="font-mono text-xs">{c.teeth_number}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Shade:</span>{" "}
                      <span className="font-medium">{c.teeth_shade}</span>
                    </div>
                    {c.preferred_lab && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Lab:</span>{" "}
                        <span className="font-medium">{(c.preferred_lab as any)?.name}</span>
                      </div>
                    )}
                  </div>
                  {c.biological_notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {c.biological_notes}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => handleReorder(c)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reorder
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPhotoCase(c)}>
                      <Camera className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete patient case?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this case from your library. Existing orders are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) deleteCase.mutate(deleteTarget);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Photo Manager Dialog */}
        <Dialog open={!!photoCase} onOpenChange={() => setPhotoCase(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{photoCase?.patient_name} — Photos</DialogTitle>
            </DialogHeader>
            {photoCase && (
              <CasePhotoUploader caseId={photoCase.id} photos={photoCase.photos} />
            )}
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={lightboxPhotos.length > 0} onOpenChange={closeLightbox}>
          <DialogContent className="sm:max-w-2xl p-2">
            {lightboxPhotos.length > 0 && (
              <div
                className="relative select-none"
                onTouchStart={(e) => {
                  const startX = e.touches[0].clientX;
                  const el = e.currentTarget;
                  const handleEnd = (ev: TouchEvent) => {
                    const diff = ev.changedTouches[0].clientX - startX;
                    if (diff > 50) setLightboxIndex((i) => Math.max(i - 1, 0));
                    if (diff < -50) setLightboxIndex((i) => Math.min(i + 1, lightboxPhotos.length - 1));
                    el.removeEventListener("touchend", handleEnd);
                  };
                  el.addEventListener("touchend", handleEnd);
                }}
              >
                <img
                  src={lightboxPhotos[lightboxIndex]}
                  alt={`Photo ${lightboxIndex + 1} of ${lightboxPhotos.length}`}
                  className="w-full h-auto rounded-md max-h-[70vh] object-contain"
                />
                {lightboxPhotos.length > 1 && (
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2">
                    <button
                      onClick={() => setLightboxIndex((i) => Math.max(i - 1, 0))}
                      disabled={lightboxIndex === 0}
                      className="pointer-events-auto p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md disabled:opacity-30 hover:bg-background transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setLightboxIndex((i) => Math.min(i + 1, lightboxPhotos.length - 1))}
                      disabled={lightboxIndex === lightboxPhotos.length - 1}
                      className="pointer-events-auto p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md disabled:opacity-30 hover:bg-background transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
                {lightboxPhotos.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs font-medium">
                    {lightboxIndex + 1} / {lightboxPhotos.length}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </ProtectedRoute>
  );
};

export default PatientCases;
