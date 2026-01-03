import { useState } from "react";
import { useTransactions, Transaction, TransactionType } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
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

interface IncomeExpenseDataProps {
  userId: string;
  type: TransactionType;
}

export function IncomeExpenseData({ userId, type }: IncomeExpenseDataProps) {
  const { data: transactions, isLoading, create, update, delete: deleteTx, isCreating, isUpdating } = useTransactions(userId, type);
  const { data: categories } = useCategories(userId, type);
  const { data: accounts } = useBankAccounts(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "EUR",
    date: new Date().toISOString().split("T")[0],
    value_date: "",
    category_id: "",
    bank_account_id: "",
    description: "",
  });

  const title = type === "income" ? "Ingresos" : "Gastos";

  const handleSubmit = async () => {
    const txData = {
      type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      date: new Date(formData.date).toISOString(),
      value_date: formData.value_date ? new Date(formData.value_date).toISOString() : null,
      category_id: formData.category_id || null,
      bank_account_id: formData.bank_account_id || null,
      description: formData.description || null,
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
      amount: "",
      currency: "EUR",
      date: new Date().toISOString().split("T")[0],
      value_date: "",
      category_id: "",
      bank_account_id: "",
      description: "",
    });
    setEditingTx(null);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData({
      amount: tx.amount.toString(),
      currency: tx.currency,
      date: tx.date.split("T")[0],
      value_date: tx.value_date ? tx.value_date.split("T")[0] : "",
      category_id: tx.category_id || "",
      bank_account_id: tx.bank_account_id || "",
      description: tx.description || "",
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>Gestiona tus {title.toLowerCase()}</CardDescription>
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
              <DialogTitle>{editingTx ? `Editar ${type === "income" ? "ingreso" : "gasto"}` : `Nuevo ${type === "income" ? "ingreso" : "gasto"}`}</DialogTitle>
              <DialogDescription>
                {editingTx ? "Modifica los datos" : "Añade una nueva transacción"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Importe</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                <Label>Cuenta (opcional)</Label>
                <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cuenta</SelectItem>
                    {accounts?.filter(a => !a.is_archived).map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !formData.amount}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTx ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {transactions?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No hay {title.toLowerCase()}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), "dd MMM yyyy", { locale: es })}</TableCell>
                    <TableCell>{tx.description || "-"}</TableCell>
                    <TableCell>
                      {categories?.find(c => c.id === tx.category_id)?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {accounts?.find(a => a.id === tx.bank_account_id)?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={type === "income" ? "default" : "destructive"} className={type === "income" ? "bg-success" : ""}>
                        {type === "income" ? "+" : "-"}{tx.amount} {tx.currency}
                      </Badge>
                    </TableCell>
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
                              <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
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
