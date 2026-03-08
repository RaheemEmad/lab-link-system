import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FilterPreset {
  name: string;
  statusFilter: string;
  dateRange: string;
  searchTerm: string;
}

interface SavedFiltersProps {
  userId: string;
  currentFilters: Omit<FilterPreset, "name">;
  onLoadPreset: (preset: Omit<FilterPreset, "name">) => void;
}

const STORAGE_KEY = (uid: string) => `lablink_filter_presets_${uid}`;
const MAX_PRESETS = 5;

const getPresets = (uid: string): FilterPreset[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(uid)) || "[]");
  } catch {
    return [];
  }
};

const savePresets = (uid: string, presets: FilterPreset[]) => {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(presets));
};

export const SavedFilters = ({ userId, currentFilters, onLoadPreset }: SavedFiltersProps) => {
  const [presets, setPresets] = useState<FilterPreset[]>(() => getPresets(userId));
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    if (presets.length >= MAX_PRESETS) {
      toast.error(`Maximum ${MAX_PRESETS} presets allowed`);
      return;
    }
    const newPresets = [...presets, { name: saveName.trim(), ...currentFilters }];
    savePresets(userId, newPresets);
    setPresets(newPresets);
    setSaveName("");
    setShowSaveInput(false);
    toast.success("Filter preset saved");
  };

  const handleDelete = (index: number) => {
    const newPresets = presets.filter((_, i) => i !== index);
    savePresets(userId, newPresets);
    setPresets(newPresets);
    toast.success("Preset deleted");
  };

  const handleLoad = (preset: FilterPreset) => {
    onLoadPreset({ statusFilter: preset.statusFilter, dateRange: preset.dateRange, searchTerm: preset.searchTerm });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bookmark className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Presets</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {presets.length === 0 && !showSaveInput && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">No saved presets</div>
        )}
        {presets.map((preset, i) => (
          <DropdownMenuItem key={i} className="flex justify-between" onSelect={() => handleLoad(preset)}>
            <span className="truncate">{preset.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
              className="ml-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {showSaveInput ? (
          <div className="p-2 flex gap-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Preset name"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 px-2">
              <Save className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <DropdownMenuItem onSelect={() => setShowSaveInput(true)} disabled={presets.length >= MAX_PRESETS}>
            <Save className="h-4 w-4 mr-2" />
            Save Current Filters
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
