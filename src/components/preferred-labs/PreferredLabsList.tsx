import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trash2, GripVertical } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface Lab {
  id: string;
  name: string;
  pricing_tier: string;
  performance_score: number;
}

interface PreferredLab {
  id: string;
  lab_id: string;
  priority_order: number;
  labs: Lab;
}

interface PreferredLabsListProps {
  preferredLabs: PreferredLab[];
  onRemove: (id: string) => void;
  onReorder: (labs: PreferredLab[]) => void;
}

// Sortable Item Component
interface SortableLabItemProps {
  pref: PreferredLab;
  index: number;
  onDelete: (lab: PreferredLab, event: React.MouseEvent) => void;
  isDeleting: boolean;
  isNew: boolean;
}

const SortableLabItem = ({ pref, index, onDelete, isDeleting, isNew }: SortableLabItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pref.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-400 ease-out",
        isDeleting && "opacity-0 scale-95 -translate-x-8",
        isNew && "animate-in slide-in-from-right-8 fade-in-0 duration-500"
      )}
    >
      <Card 
        className={cn(
          "border-l-4 border-l-primary overflow-hidden group",
          "hover:shadow-lg transition-all duration-200",
          isNew && "border-l-accent",
          isDragging && "shadow-2xl scale-105 cursor-grabbing"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div 
              {...attributes}
              {...listeners}
              className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Priority Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm shrink-0 transition-colors",
                index === 0 && "bg-primary/10 border-primary text-primary"
              )}
            >
              #{index + 1}
            </Badge>

            {/* Lab Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base mb-1 truncate">
                {pref.labs.name}
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {pref.labs.pricing_tier}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-muted-foreground">
                    {pref.labs.performance_score?.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => onDelete(pref, e)}
              className={cn(
                "text-muted-foreground hover:text-destructive shrink-0",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PreferredLabsList = ({
  preferredLabs,
  onRemove,
  onReorder,
}: PreferredLabsListProps) => {
  const [items, setItems] = useState(preferredLabs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<PreferredLab | null>(null);
  const [toothAnimation, setToothAnimation] = useState<{ x: number; y: number } | null>(null);
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setItems(preferredLabs);
  }, [preferredLabs]);

  useEffect(() => {
    const currentIds = new Set(preferredLabs.map(lab => lab.id));
    const previousIds = new Set(Array.from(newlyAdded));
    
    currentIds.forEach(id => {
      if (!previousIds.has(id)) {
        setNewlyAdded(prev => new Set([...prev, id]));
        setTimeout(() => {
          setNewlyAdded(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 1000);
      }
    });
  }, [preferredLabs.length]);

  const handleDeleteClick = (lab: PreferredLab, event: React.MouseEvent) => {
    setSelectedForDelete(lab);
    setShowDeleteDialog(true);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setToothAnimation({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedForDelete) return;
    
    setDeletingId(selectedForDelete.id);
    
    setTimeout(() => {
      onRemove(selectedForDelete.id);
      setDeletingId(null);
      setSelectedForDelete(null);
      setToothAnimation(null);
    }, 400);
    
    setShowDeleteDialog(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSelectedForDelete(null);
    setToothAnimation(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onReorder(newItems);
    }
  };

  if (items.length === 0) return null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.map((pref, index) => (
              <SortableLabItem
                key={pref.id}
                pref={pref}
                index={index}
                onDelete={handleDeleteClick}
                isDeleting={deletingId === pref.id}
                isNew={newlyAdded.has(pref.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Preferred Lab</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {selectedForDelete?.labs.name} from your preferred labs? This will lower the priority of all labs below it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tooth Animation on Delete */}
      {toothAnimation && (
        <div
          className="fixed pointer-events-none z-50 animate-in zoom-in-0 spin-in-180 fade-in-0 duration-500 animate-out zoom-out-0 fade-out-0"
          style={{
            left: `${toothAnimation.x}px`,
            top: `${toothAnimation.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="text-6xl">🦷</div>
        </div>
      )}
    </>
  );
};
