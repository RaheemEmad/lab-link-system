import { formatDistanceToNow } from "date-fns";
import { Check, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ChecklistItemData {
  id: string;
  item_name: string;
  item_description: string | null;
  display_order: number;
  doctor_confirmed: boolean | null;
  doctor_confirmed_by: string | null;
  doctor_confirmed_at: string | null;
  lab_confirmed: boolean | null;
  lab_confirmed_by: string | null;
  lab_confirmed_at: string | null;
  doctor_profile?: { full_name: string | null } | null;
  lab_profile?: { full_name: string | null } | null;
}

interface ChecklistItemProps {
  item: ChecklistItemData;
  isDoctor: boolean;
  isLabStaff: boolean;
  onConfirm: (itemId: string, role: "doctor" | "lab") => void;
}

const ChecklistItem = ({ item, isDoctor, isLabStaff, onConfirm }: ChecklistItemProps) => {
  const bothConfirmed = item.doctor_confirmed && item.lab_confirmed;

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        bothConfirmed
          ? "bg-green-500/5 border-green-500/20"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            bothConfirmed
              ? "bg-green-500 text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {bothConfirmed ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className="text-sm font-medium">{item.display_order}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.item_name}</p>
          {item.item_description && (
            <p className="text-sm text-muted-foreground mt-1">
              {item.item_description}
            </p>
          )}

          {/* Confirmation Status */}
          <div className="flex flex-wrap gap-4 mt-3">
            {/* Doctor Confirmation */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`doctor-${item.id}`}
                checked={item.doctor_confirmed || false}
                onCheckedChange={() => onConfirm(item.id, "doctor")}
                disabled={!isDoctor || item.doctor_confirmed === true}
              />
              <label
                htmlFor={`doctor-${item.id}`}
                className="text-sm flex items-center gap-2"
              >
                <Badge variant="outline" className="text-xs">
                  Doctor
                </Badge>
                {item.doctor_confirmed ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {item.doctor_profile?.full_name || "Confirmed"}
                    {item.doctor_confirmed_at && (
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(item.doctor_confirmed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </label>
            </div>

            {/* Lab Confirmation */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`lab-${item.id}`}
                checked={item.lab_confirmed || false}
                onCheckedChange={() => onConfirm(item.id, "lab")}
                disabled={!isLabStaff || item.lab_confirmed === true}
              />
              <label
                htmlFor={`lab-${item.id}`}
                className="text-sm flex items-center gap-2"
              >
                <Badge variant="outline" className="text-xs">
                  Lab
                </Badge>
                {item.lab_confirmed ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {item.lab_profile?.full_name || "Confirmed"}
                    {item.lab_confirmed_at && (
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(item.lab_confirmed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistItem;
