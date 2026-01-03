import { useState } from "react";
import { useCategories, Category, CategoryScope } from "@/hooks/useCategories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Archive } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const scopeLabels: Record<CategoryScope, string> = {
  expense: "Gastos",
  income: "Ingresos",
  subscription: "Suscripciones",
  account: "Cuentas",
  asset: "Activos",
};

interface CategoriesTabProps {
  userId: string;
}

export function CategoriesTab({ userId }: CategoriesTabProps) {
  const [selectedScope, setSelectedScope] = useState<CategoryScope>("expense");
  const { data: categories, isLoading, create, update, delete: deleteCategory, isCreating, isUpdating } = useCategories(userId, selectedScope);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sort_order: 0,
    is_archived: false,
  });

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
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Categorías</CardTitle>
          <CardDescription>Organiza tus transacciones y activos</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
              <DialogDescription>
                Categoría para: {scopeLabels[selectedScope]}
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
              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
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
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={selectedScope} onValueChange={(v) => setSelectedScope(v as CategoryScope)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {(Object.keys(scopeLabels) as CategoryScope[]).map((scope) => (
              <TabsTrigger key={scope} value={scope} className="text-xs sm:text-sm">
                {scopeLabels[scope]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {categories?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No hay categorías de {scopeLabels[selectedScope].toLowerCase()}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id} className={category.is_archived ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.sort_order}</TableCell>
                  <TableCell>
                    {category.is_archived ? (
                      <Badge variant="secondary">Archivada</Badge>
                    ) : (
                      <Badge variant="default" className="bg-success">Activa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => update({ id: category.id, is_archived: !category.is_archived })}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
