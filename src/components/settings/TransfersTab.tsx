import { useState, useEffect } from "react";
import { useTransfers, Transfer } from "@/hooks/useTransfers";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useFxRates } from "@/hooks/useFxRates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, ArrowRightLeft } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TransfersTabProps {
  userId: string;
}

export function TransfersTab({ userId }: TransfersTabProps) {
  const { data: transfers, isLoading, create, update, delete: deleteTransfer, isCreating, isUpdating } = useTransfers(userId);
  const { data: accounts } = useBankAccounts(userId);
  const { getLatestRate, fetchRate, isFetching } = useFxRates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState({
    from_account_id: "",
    to_account_id: "",
    amount_from: "",
    amount_to: "",
    date: new Date().toISOString().split("T")[0],
    value_date: "",
    description: "",
    fx_rate: null as number | null,
  });

  const activeAccounts = accounts?.filter(a => !a.is_archived) || [];
  const fromAccount = activeAccounts.find(a => a.id === formData.from_account_id);
  const toAccount = activeAccounts.find(a => a.id === formData.to_account_id);
  const needsConversion = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  useEffect(() => {
    if (needsConversion && formData.amount_from) {
      const rate = getLatestRate("USDT_EUR");
      if (rate) {
        setFormData(prev => ({ ...prev, fx_rate: rate }));
        const amountFrom = parseFloat(formData.amount_from);
        if (!isNaN(amountFrom)) {
          const amountTo = fromAccount.currency === "EUR" 
            ? amountFrom / rate 
            : amountFrom * rate;
          setFormData(prev => ({ ...prev, amount_to: amountTo.toFixed(2) }));
        }
      }
    } else if (!needsConversion && formData.amount_from) {
      setFormData(prev => ({ ...prev, amount_to: formData.amount_from, fx_rate: null }));
    }
  }, [formData.amount_from, formData.from_account_id, formData.to_account_id, needsConversion]);

  const handleSubmit = async () => {
    if (!fromAccount || !toAccount) return;
    
    const transferData = {
      from_account_id: formData.from_account_id,
      to_account_id: formData.to_account_id,
      amount_from: parseFloat(formData.amount_from),
      currency_from: fromAccount.currency,
      amount_to: parseFloat(formData.amount_to),
      currency_to: toAccount.currency,
      fx_rate: formData.fx_rate,
      date: new Date(formData.date).toISOString(),
      value_date: formData.value_date ? new Date(formData.value_date).toISOString() : null,
      description: formData.description || null,
    };

    if (editingTransfer) {
      await update({ id: editingTransfer.id, ...transferData });
    } else {
      await create(transferData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      from_account_id: "",
      to_account_id: "",
      amount_from: "",
      amount_to: "",
      date: new Date().toISOString().split("T")[0],
      value_date: "",
      description: "",
      fx_rate: null,
    });
    setEditingTransfer(null);
  };

  const openEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      from_account_id: transfer.from_account_id,
      to_account_id: transfer.to_account_id,
      amount_from: transfer.amount_from.toString(),
      amount_to: transfer.amount_to.toString(),
      date: transfer.date.split("T")[0],
      value_date: transfer.value_date ? transfer.value_date.split("T")[0] : "",
      description: transfer.description || "",
      fx_rate: transfer.fx_rate,
    });
    setIsDialogOpen(true);
  };

  const getAccountName = (id: string) => accounts?.find(a => a.id === id)?.name || "-";

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
          <h3 className="font-semibold">Transferencias</h3>
          <p className="text-sm text-muted-foreground">{transfers?.length || 0} registros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchRate()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva
          </Button>
        </div>
      </div>

      {/* Transfers List */}
      {transfers?.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No hay transferencias</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers?.map((transfer) => (
            <div
              key={transfer.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50"
            >
              <div className="h-10 w-10 rounded-full bg-chart-assets/10 flex items-center justify-center text-chart-assets shrink-0">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {getAccountName(transfer.from_account_id)} → {getAccountName(transfer.to_account_id)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(transfer.date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-semibold">
                  {formatCurrency(transfer.amount_from, transfer.currency_from)}
                </span>
                {transfer.currency_from !== transfer.currency_to && (
                  <p className="text-xs text-muted-foreground">
                    → {formatCurrency(transfer.amount_to, transfer.currency_to)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(transfer)}>
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
                      <AlertDialogTitle>¿Eliminar transferencia?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTransfer(transfer.id)}>
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
            <DialogTitle>{editingTransfer ? "Editar transferencia" : "Nueva transferencia"}</DialogTitle>
            <DialogDescription>
              {editingTransfer ? "Modifica los datos" : "Crea una transferencia entre cuentas"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Desde cuenta</Label>
              <Select value={formData.from_account_id} onValueChange={(v) => setFormData({ ...formData, from_account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hacia cuenta</Label>
              <Select value={formData.to_account_id} onValueChange={(v) => setFormData({ ...formData, to_account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.filter(a => a.id !== formData.from_account_id).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importe origen</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount_from}
                  onChange={(e) => setFormData({ ...formData, amount_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Importe destino</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount_to}
                  onChange={(e) => setFormData({ ...formData, amount_to: e.target.value })}
                  disabled={!needsConversion}
                />
              </div>
            </div>
            {needsConversion && formData.fx_rate && (
              <p className="text-sm text-muted-foreground">
                1 USDT = {formData.fx_rate.toFixed(4)} EUR
              </p>
            )}
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
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isCreating || isUpdating || !formData.from_account_id || !formData.to_account_id || !formData.amount_from}
            >
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTransfer ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
