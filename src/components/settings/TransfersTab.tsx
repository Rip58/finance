import { useState, useEffect } from "react";
import { useTransfers, Transfer } from "@/hooks/useTransfers";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useFxRates } from "@/hooks/useFxRates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
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
          // EUR -> USDT: divide by rate, USDT -> EUR: multiply by rate
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
          <CardTitle>Transferencias</CardTitle>
          <CardDescription>Movimientos entre cuentas</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRate()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Actualizar FX</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransfer ? "Editar transferencia" : "Nueva transferencia"}</DialogTitle>
                <DialogDescription>
                  {editingTransfer ? "Modifica los datos" : "Crea una transferencia entre cuentas"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Importe origen {fromAccount && `(${fromAccount.currency})`}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount_from}
                      onChange={(e) => setFormData({ ...formData, amount_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Importe destino {toAccount && `(${toAccount.currency})`}</Label>
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
                    Tipo de cambio: 1 USDT = {formData.fx_rate.toFixed(4)} EUR
                  </p>
                )}
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
                  <Label>Descripción (opcional)</Label>
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
      </CardHeader>
      <CardContent>
        {transfers?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No hay transferencias</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Hacia</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers?.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{format(new Date(transfer.date), "dd MMM yyyy", { locale: es })}</TableCell>
                  <TableCell>{getAccountName(transfer.from_account_id)}</TableCell>
                  <TableCell>{getAccountName(transfer.to_account_id)}</TableCell>
                  <TableCell className="text-right">
                    {transfer.amount_from} {transfer.currency_from}
                    {transfer.currency_from !== transfer.currency_to && (
                      <span className="text-muted-foreground"> → {transfer.amount_to} {transfer.currency_to}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(transfer)}>
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
