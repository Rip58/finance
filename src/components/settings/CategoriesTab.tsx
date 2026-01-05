import { useState, useEffect } from "react";
import { useCategories, Category, CategoryScope } from "@/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Archive, Tag } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const scopeLabels: Record<CategoryScope, string> = {
  expense: "Gastos",
  income: "Ingresos",
  subscription: "Suscripciones",
  account: "Cuentas",
  asset: "Activos",
  general: "General",
};

const scopeColors: Record<CategoryScope, string> = {
  expense: "bg-destructive/10 text-destructive",
  income: "bg-success/10 text-success",
  subscription: "bg-warning/10 text-warning",
  account: "bg-primary/10 text-primary",
  asset: "bg-chart-assets/10 text-chart-assets",
  general: "bg-primary/10 text-primary",
};

interface CategoriesTabProps {
  userId: string;
}

export function CategoriesTab({ userId }: CategoriesTabProps) {
  const queryClient = useQueryClient();
  const selectedScope = "general";
  const { data: categories, isLoading, create, update, delete: deleteCategory, isCreating, isUpdating } = useCategories(userId, selectedScope);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sort_order: 0,
    is_archived: false,
  });
  const [isInitializing, setIsInitializing] = useState(false);

  const DEFAULT_GENERAL_CATEGORIES = [
    "Vivienda", "Alimentación", "Transporte", "Servicios",
    "Ocio", "Compras", "Salud", "Educación",
    "Familia", "Regalos", "Viajes", "Inversiones",
    "Ahorro", "Nómina", "Otros"
  ];

  const handleInitializeDefaults = async () => {
    setIsInitializing(true);
    try {
      const categoriesToInsert = DEFAULT_GENERAL_CATEGORIES.map((catName, index) => ({
        name: catName,
        scope: "general",
        sort_order: index,
        is_archived: false,
        user_id: userId
      }));

      const { error } = await supabase
        .from("categories")
        .insert(categoriesToInsert);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["categories", userId] });
    } catch (error) {
      console.error("Error creating default categories:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isLoading || isInitializing || !categories || categories.length > 0) return;
    handleInitializeDefaults();
  }, [categories, isLoading, userId]);

  const handleSubmit = async () => {
    if (editingCategory) {
      await update({ id: editingCategory.id, ...formData });
    } else {
      await create({ ...formData, scope: selectedScope });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: "", sort_order: 0, is_archived: false });
    setEditingCategory(null);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      sort_order: category.sort_order,
      is_archived: category.is_archived,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Categorías</h3>
          <p className="text-sm text-muted-foreground">Organiza tus transacciones</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      {/* Categories List */}
      {categories?.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            {isInitializing ? "Configurando categorías por defecto..." : "No hay categorías configuradas"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories?.map((category) => (
            <div
              key={category.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50",
                category.is_archived && "opacity-50"
              )}
            >
              <div className="h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0 bg-primary/10 text-primary">
                {category.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{category.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteCategory(category.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              Crea o edita una categoría para tus transacciones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !formData.name}>
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
