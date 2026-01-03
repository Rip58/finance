import { useState } from "react";
import { useTransactions, Transaction, TransactionType } from "@/hooks/useTransactions";
import { useRecurringTransactions, PendingRecurring } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, Check, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface IncomeExpenseDataProps {
  userId: string;
  type: TransactionType;
}

export function IncomeExpenseData({ userId, type }: IncomeExpenseDataProps) {
  const { data: transactions, isLoading, create, update, delete: deleteTx, isCreating, isUpdating } = useTransactions(userId, type);
  const { pending, recurring, confirm, create: createRecurring, isConfirming } = useRecurringTransactions(userId);
  const { data: categories } = useCategories(userId, type);
  const { data: accounts } = useBankAccounts(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [adjustedAmounts, setAdjustedAmounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    amount: "",
    currency: "EUR",
    date: new Date().toISOString().split("T")[0],
    value_date: "",
    category_id: "none",
    bank_account_id: "none",
    description: "",
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");

  const title = type === "income" ? "Ingresos" : "Gastos";
  const Icon = type === "income" ? TrendingUp : TrendingDown;
  const colorClass = type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive";

  // Filter pending by type
  const pendingItems = pending.filter(p => p.type === type);

  const handleSubmit = async () => {
    const txData = {
      type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      date: new Date(formData.date).toISOString(),
      value_date: formData.value_date ? new Date(formData.value_date).toISOString() : null,
      category_id: formData.category_id === "none" ? null : formData.category_id,
      bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
      description: formData.description || null,
    };

    if (editingTx) {
      await update({ id: editingTx.id, ...txData });
    } else {
      await create(txData);
      
      // If recurring, also create the recurring template
      if (isRecurring) {
        createRecurring({
          type,
          name: formData.description || (type === "income" ? "Ingreso recurrente" : "Gasto recurrente"),
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          category_id: formData.category_id === "none" ? null : formData.category_id,
          bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
          cadence,
          start_date: formData.date,
          next_occurrence_date: formData.date,
          is_active: true,
          notes: null,
        });
      }
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
      category_id: "none",
      bank_account_id: "none",
      description: "",
    });
    setEditingTx(null);
    setIsRecurring(false);
    setCadence("monthly");
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData({
      amount: tx.amount.toString(),
      currency: tx.currency,
      date: tx.date.split("T")[0],
      value_date: tx.value_date ? tx.value_date.split("T")[0] : "",
      category_id: tx.category_id || "none",
      bank_account_id: tx.bank_account_id || "none",
      description: tx.description || "",
    });
    setIsRecurring(false);
    setIsDialogOpen(true);
  };

  const handleConfirm = (item: PendingRecurring) => {
    const adjustedAmount = adjustedAmounts[item.id];
    confirm({ recurring: item, adjustedAmount });
  };

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency === "USDT" ? "USD" : currency,
    }).format(value);

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
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{transactions?.length || 0} registros</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* Pending Recurring Section */}
      {pendingItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-muted-foreground">Pendientes de confirmar</span>
          </div>
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-warning/5 border border-warning/20"
            >
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{item.name}</p>
                  <Badge variant="outline" className="text-xs">Recurrente</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.occurrence_date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  className="w-24 h-8 text-right text-sm"
                  value={adjustedAmounts[item.id] ?? item.amount}
                  onChange={(e) => setAdjustedAmounts(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                />
                <Button 
                  size="sm" 
                  onClick={() => handleConfirm(item)}
                  disabled={isConfirming}
                >
                  {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions List */}
      {transactions?.length === 0 && pendingItems.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No hay {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions?.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50"
            >
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {tx.description || categories?.find(c => c.id === tx.category_id)?.name || "Sin descripción"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={cn("font-semibold", type === "income" ? "text-success" : "text-foreground")}>
                  {type === "income" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
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
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTx ? `Editar ${type === "income" ? "ingreso" : "gasto"}` : `Nuevo ${type === "income" ? "ingreso" : "gasto"}`}</DialogTitle>
            <DialogDescription>
              {editingTx ? "Modifica los datos" : "Añade una nueva transacción"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha valor</Label>
                <Input
                  type="date"
                  value={formData.value_date}
                  onChange={(e) => setFormData({ ...formData, value_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories?.filter(c => !c.is_archived).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cuenta</SelectItem>
                  {accounts?.filter(a => !a.is_archived).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            
            {/* Recurring Switch - only show when creating new */}
            {!editingTx && (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Hacer recurrente</p>
                    <p className="text-xs text-muted-foreground">Repetir automáticamente</p>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>
                
                {isRecurring && (
                  <div className="space-y-2">
                    <Label>Frecuencia</Label>
                    <Select value={cadence} onValueChange={(v) => setCadence(v as typeof cadence)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
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
    </div>
  );
}
