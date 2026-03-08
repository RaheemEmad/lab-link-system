import { useState } from "react";
import { useLabInventory, INVENTORY_CATEGORIES, InventoryItem } from "@/hooks/useLabInventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Package,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface ItemFormData {
  material_name: string;
  category: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  cost_per_unit: number | null;
  supplier_name: string | null;
  notes: string | null;
}

const defaultForm: ItemFormData = {
  material_name: "",
  category: "Zirconia",
  current_stock: 0,
  unit: "units",
  minimum_stock: 0,
  cost_per_unit: null,
  supplier_name: null,
  notes: null,
};

export const InventoryManager = () => {
  const { items, lowStockItems, isLoading, addItem, updateItem, deleteItem } = useLabInventory();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData({
      material_name: item.material_name,
      category: item.category,
      current_stock: item.current_stock,
      unit: item.unit,
      minimum_stock: item.minimum_stock,
      cost_per_unit: item.cost_per_unit,
      supplier_name: item.supplier_name,
      notes: item.notes,
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.material_name.trim()) return;
    if (editingId) {
      updateItem.mutate({ id: editingId, ...formData });
    } else {
      addItem.mutate(formData as any);
    }
    setFormOpen(false);
  };

  const isLowStock = (item: InventoryItem) =>
    item.minimum_stock > 0 && item.current_stock <= item.minimum_stock;

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert ({lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="destructive" className="text-xs">
                  {item.material_name}: {item.current_stock} {item.unit} (min: {item.minimum_stock})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory ({items.length})
          </h3>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">No inventory items yet</p>
            <p className="text-sm text-muted-foreground">Add materials to start tracking stock levels.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={isLowStock(item) ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isLowStock(item) && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        {item.material_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.current_stock} {item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {item.minimum_stock}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {item.supplier_name || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Material Name *</Label>
              <Input
                value={formData.material_name}
                onChange={(e) => setFormData((f) => ({ ...f, material_name: e.target.value }))}
                placeholder="e.g., Katana Zirconia Block"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="units, blocks, grams..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.current_stock}
                  onChange={(e) => setFormData((f) => ({ ...f, current_stock: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData((f) => ({ ...f, minimum_stock: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost Per Unit</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.cost_per_unit ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, cost_per_unit: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier_name ?? ""}
                  onChange={(e) => setFormData((f) => ({ ...f, supplier_name: e.target.value || null }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.material_name.trim() || addItem.isPending || updateItem.isPending}
            >
              {editingId ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove inventory item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteItem.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
