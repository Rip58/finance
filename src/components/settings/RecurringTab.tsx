import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useRecurringTransactions, type RecurringTransaction, type PendingRecurring } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";

interface RecurringTabProps {
  userId: string;
}

const cadenceLabels: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export function RecurringTab({ userId }: RecurringTabProps) {
  const { recurring, pending, isLoading, confirm, create, update, delete: deleteRecurring, isConfirming } = useRecurringTransactions(userId);
  const { data: categories = [] } = useCategories(userId);
  const { data: accounts = [] } = useBankAccounts(userId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [adjustedAmounts, setAdjustedAmounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    name: "",
    amount: "",
    currency: "EUR",
    category_id: "none",
    bank_account_id: "none",
    cadence: "monthly" as "weekly" | "monthly" | "quarterly" | "yearly",
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      type: "expense",
      name: "",
      amount: "",
      currency: "EUR",
      category_id: "none",
      bank_account_id: "none",
      cadence: "monthly",
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: RecurringTransaction) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        type: item.type,
        name: item.name,
        amount: item.amount.toString(),
        currency: item.currency,
        category_id: item.category_id || "none",
        bank_account_id: item.bank_account_id || "none",
        cadence: item.cadence,
        start_date: item.start_date,
        notes: item.notes || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      type: formData.type,
      name: formData.name,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      category_id: formData.category_id === "none" ? null : formData.category_id,
      bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
      cadence: formData.cadence,
      start_date: formData.start_date,
      next_occurrence_date: formData.start_date,
      is_active: true,
      notes: formData.notes || null,
    };

    if (editingItem) {
      update({ id: editingItem.id, ...data });
    } else {
      create(data);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleConfirm = (item: PendingRecurring) => {
    const adjustedAmount = adjustedAmounts[item.id];
    confirm({ recurring: item, adjustedAmount });
  };

  const incomeCategories = categories.filter((c) => c.scope === "income" && !c.is_archived);
  const expenseCategories = categories.filter((c) => c.scope === "expense" && !c.is_archived);
  const activeAccounts = accounts.filter((a) => !a.is_archived);

  const pendingIncome = pending.filter((p) => p.type === "income");
  const pendingExpense = pending.filter((p) => p.type === "expense");

  if (isLoading) {
    return <div className="text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Confirmations */}
      {pending.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="default" className="rounded-full">
                {pending.length}
              </Badge>
              Pendientes de Confirmar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingIncome.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-600">Ingresos</h4>
                {pendingIncome.map((item) => (
                  <PendingItem
                    key={item.id}
                    item={item}
                    adjustedAmount={adjustedAmounts[item.id]}
                    onAmountChange={(amount) => setAdjustedAmounts((prev) => ({ ...prev, [item.id]: amount }))}
                    onConfirm={() => handleConfirm(item)}
                    isConfirming={isConfirming}
                  />
                ))}
              </div>
            )}
            {pendingExpense.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Gastos</h4>
                {pendingExpense.map((item) => (
                  <PendingItem
                    key={item.id}
                    item={item}
                    adjustedAmount={adjustedAmounts[item.id]}
                    onAmountChange={(amount) => setAdjustedAmounts((prev) => ({ ...prev, [item.id]: amount }))}
                    onConfirm={() => handleConfirm(item)}
                    isConfirming={isConfirming}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Plantillas Recurrentes</CardTitle>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurring.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay plantillas creadas. Crea una para empezar.</p>
          ) : (
            <div className="space-y-2">
              {recurring.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant={item.type === "income" ? "default" : "secondary"} className="text-xs">
                        {item.type === "income" ? "Ingreso" : "Gasto"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {cadenceLabels[item.cadence]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.amount.toLocaleString("es-ES")} {item.currency} · Próximo: {format(new Date(item.next_occurrence_date), "d MMM yyyy", { locale: es })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará la plantilla "{item.name}". Las transacciones ya confirmadas no se verán afectadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteRecurring(item.id)}>
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Plantilla" : "Nueva Plantilla Recurrente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "income" | "expense" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={formData.cadence} onValueChange={(v) => setFormData({ ...formData, cadence: v as any })}>
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
            </div>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Nómina, Alquiler..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importe</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
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
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría (opcional)</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {(formData.type === "income" ? incomeCategories : expenseCategories).map((cat) => (
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
                  <SelectItem value="none">Sin cuenta</SelectItem>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.amount}>
              {editingItem ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingItem({
  item,
  adjustedAmount,
  onAmountChange,
  onConfirm,
  isConfirming,
}: {
  item: PendingRecurring;
  adjustedAmount?: number;
  onAmountChange: (amount: number) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const displayAmount = adjustedAmount ?? item.amount;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
      <Checkbox
        checked={false}
        onCheckedChange={() => onConfirm()}
        disabled={isConfirming}
        className="h-5 w-5"
      />
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(item.occurrence_date), "d MMMM yyyy", { locale: es })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            type="number"
            step="0.01"
            className="w-24 h-8 text-right"
            value={displayAmount}
            onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
            onBlur={() => setEditing(false)}
            autoFocus
          />
        ) : (
          <span
            className={`font-medium cursor-pointer hover:underline ${item.type === "income" ? "text-green-600" : "text-red-600"}`}
            onClick={() => setEditing(true)}
          >
            {item.type === "income" ? "+" : "-"}{displayAmount.toLocaleString("es-ES")} {item.currency}
          </span>
        )}
        <Button size="icon" variant="ghost" onClick={() => setEditing(!editing)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
