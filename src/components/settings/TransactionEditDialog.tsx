import { useState } from "react";
import { Transaction, useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, Check, Circle, TrendingUp, TrendingDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

interface TransactionEditDialogProps {
  transaction: Transaction;
  userId: string;
  onClose: () => void;
}

export function TransactionEditDialog({ transaction, userId, onClose }: TransactionEditDialogProps) {
  const { update, delete: deleteTransaction, isUpdating, isDeleting } = useTransactions(userId, transaction.type);
  const { data: categories = [] } = useCategories(userId, transaction.type);
  const { data: accounts = [] } = useBankAccounts(userId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    date: transaction.date.split("T")[0],
    value_date: transaction.value_date ? transaction.value_date.split("T")[0] : "",
    category_id: transaction.category_id || "none",
    bank_account_id: transaction.bank_account_id || "none",
    description: transaction.description || "",
  });

  const handleSave = async () => {
    await update({
      id: transaction.id,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      date: new Date(formData.date).toISOString(),
      value_date: formData.value_date ? new Date(formData.value_date).toISOString() : null,
      category_id: formData.category_id === "none" ? null : formData.category_id,
      bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
      description: formData.description || null,
    });
    setIsEditing(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteTransaction(transaction.id);
    onClose();
  };

  const toggleValidation = async () => {
    await update({ id: transaction.id, is_validated: !transaction.is_validated });
  };

  const Icon = transaction.type === "income" ? TrendingUp : TrendingDown;
  const colorClass = transaction.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive";

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p>{transaction.description || (transaction.type === "income" ? "Ingreso" : "Gasto")}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {format(new Date(transaction.date), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Validation Toggle - Always visible outside edit mode */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {transaction.is_validated ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm">
                {transaction.is_validated ? "Validada" : "Pendiente de validar"}
              </span>
            </div>
            <Switch
              checked={transaction.is_validated}
              onCheckedChange={toggleValidation}
            />
          </div>

          {isEditing ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categories.filter(c => !c.is_archived).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cuenta</Label>
                  <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cuenta</SelectItem>
                      {accounts?.filter(a => !a.is_archived).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Importe</span>
                  <span className={cn("font-semibold", transaction.type === "income" ? "text-success" : "")}>
                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </div>
                {transaction.category_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoría</span>
                    <span>{categories.find(c => c.id === transaction.category_id)?.name || "-"}</span>
                  </div>
                )}
                {transaction.bank_account_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuenta</span>
                    <span>{accounts?.find(a => a.id === transaction.bank_account_id)?.name || "-"}</span>
                  </div>
                )}
                {transaction.value_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha valor</span>
                    <span>{format(new Date(transaction.value_date), "d MMM yyyy", { locale: es })}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
