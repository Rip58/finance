import { useState } from "react";
import { useAssetTransactions, AssetTransaction, AssetType, AssetSide } from "@/hooks/useAssetTransactions";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const assetTypeLabels: Record<AssetType, string> = {
  crypto: "Cripto",
  commodity: "Materia prima",
  other: "Otro",
};

interface AssetsDataProps {
  userId: string;
}

export function AssetsData({ userId }: AssetsDataProps) {
  const { data: transactions, isLoading, create, update, delete: deleteTx, isCreating, isUpdating } = useAssetTransactions(userId);
  const { data: categories } = useCategories(userId, "asset");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<AssetTransaction | null>(null);
  const [formData, setFormData] = useState({
    asset_type: "crypto" as AssetType,
    symbol: "",
    side: "buy" as AssetSide,
    quantity: "",
    price_eur: "",
    transaction_date: new Date().toISOString().split("T")[0],
    value_date: "",
    category_id: "",
    notes: "",
  });

  const handleSubmit = async () => {
    const txData = {
      asset_type: formData.asset_type,
      symbol: formData.symbol.toUpperCase(),
      side: formData.side,
      quantity: parseFloat(formData.quantity),
      price_eur: parseFloat(formData.price_eur),
      transaction_date: new Date(formData.transaction_date).toISOString(),
      value_date: formData.value_date ? new Date(formData.value_date).toISOString() : null,
      category_id: formData.category_id || null,
      notes: formData.notes || null,
    };

    if (editingTx) {
      await update({ id: editingTx.id, ...txData });
    } else {
      await create(txData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      asset_type: "crypto",
      symbol: "",
      side: "buy",
      quantity: "",
      price_eur: "",
      transaction_date: new Date().toISOString().split("T")[0],
      value_date: "",
      category_id: "",
      notes: "",
    });
    setEditingTx(null);
  };

  const openEdit = (tx: AssetTransaction) => {
    setEditingTx(tx);
    setFormData({
      asset_type: tx.asset_type,
      symbol: tx.symbol,
      side: tx.side,
      quantity: tx.quantity.toString(),
      price_eur: tx.price_eur.toString(),
      transaction_date: tx.transaction_date.split("T")[0],
      value_date: tx.value_date ? tx.value_date.split("T")[0] : "",
      category_id: tx.category_id || "",
      notes: tx.notes || "",
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Movimientos de activos</CardTitle>
          <CardDescription>Compras y ventas de activos</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTx ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
              <DialogDescription>
                {editingTx ? "Modifica los datos" : "Añade una compra o venta de activo"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de activo</Label>
                  <Select value={formData.asset_type} onValueChange={(v) => setFormData({ ...formData, asset_type: v as AssetType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(assetTypeLabels) as AssetType[]).map((t) => (
                        <SelectItem key={t} value={t}>{assetTypeLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Símbolo</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="BTC, ETH, XAU..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Operación</Label>
                  <Select value={formData.side} onValueChange={(v) => setFormData({ ...formData, side: v as AssetSide })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Compra</SelectItem>
                      <SelectItem value="sell">Venta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price_eur}
                    onChange={(e) => setFormData({ ...formData, price_eur: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha valor (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.value_date}
                    onChange={(e) => setFormData({ ...formData, value_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría (opcional)</Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin categoría</SelectItem>
                    {categories?.filter(c => !c.is_archived).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !formData.symbol || !formData.quantity || !formData.price_eur}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTx ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {transactions?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No hay movimientos de activos</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Símbolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: es })}</TableCell>
                    <TableCell className="font-mono font-medium">{tx.symbol}</TableCell>
                    <TableCell>{assetTypeLabels[tx.asset_type]}</TableCell>
                    <TableCell>
                      <Badge variant={tx.side === "buy" ? "default" : "destructive"} className={tx.side === "buy" ? "bg-success" : ""}>
                        {tx.side === "buy" ? "Compra" : "Venta"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{tx.quantity}</TableCell>
                    <TableCell className="text-right">{tx.price_eur} €</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tx)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTx(tx.id)}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
