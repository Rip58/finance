import { useState } from "react";
import { useSubscriptions, Subscription, Cadence } from "@/hooks/useSubscriptions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Repeat } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

const cadenceLabels: Record<Cadence, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

interface SubscriptionsTabProps {
  userId: string;
}

export function SubscriptionsTab({ userId }: SubscriptionsTabProps) {
  const { data: subscriptions, charges, isLoading, create, update, delete: deleteSub, isCreating, isUpdating } = useSubscriptions(userId);
  const { data: categories } = useCategories(userId, "subscription");
  const { data: accounts } = useBankAccounts(userId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    currency: "EUR",
    cadence: "monthly" as Cadence,
    start_date: new Date().toISOString().split("T")[0],
    category_id: "none",
    bank_account_id: "none",
    is_active: true,
    notes: "",
  });

  const handleSubmit = async () => {
    const startDate = formData.start_date;
    const subData = {
      name: formData.name,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      cadence: formData.cadence,
      start_date: startDate,
      next_charge_date: editingSub ? editingSub.next_charge_date : startDate,
      category_id: formData.category_id === "none" ? null : formData.category_id,
      bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
      is_active: formData.is_active,
      notes: formData.notes || null,
    };

    if (editingSub) {
      await update({ id: editingSub.id, ...subData });
    } else {
      await create(subData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      currency: "EUR",
      cadence: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      category_id: "none",
      bank_account_id: "none",
      is_active: true,
      notes: "",
    });
    setEditingSub(null);
  };

  const openEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      currency: sub.currency,
      cadence: sub.cadence,
      start_date: sub.start_date,
      category_id: sub.category_id || "none",
      bank_account_id: sub.bank_account_id || "none",
      is_active: sub.is_active,
      notes: sub.notes || "",
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
          <h3 className="font-semibold">Suscripciones</h3>
          <p className="text-sm text-muted-foreground">Cargos recurrentes</p>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva
        </Button>
      </div>

      {/* Subscriptions List */}
      {subscriptions?.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
          <Repeat className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No hay suscripciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions?.map((sub) => (
            <div
              key={sub.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50",
                !sub.is_active && "opacity-50"
              )}
            >
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
                <Repeat className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{sub.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {cadenceLabels[sub.cadence]}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(sub.next_charge_date), "d MMM", { locale: es })}
                  </span>
                  {!sub.is_active && (
                    <Badge variant="secondary" className="text-xs">Pausada</Badge>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-semibold">{formatCurrency(sub.amount, sub.currency)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sub)}>
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
                      <AlertDialogTitle>¿Eliminar suscripción?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Los cargos ya generados no se eliminarán.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSub(sub.id)}>
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
            <DialogTitle>{editingSub ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
            <DialogDescription>
              Los cargos se generan automáticamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Netflix, Spotify..."
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
                <Label>Cadencia</Label>
                <Select value={formData.cadence} onValueChange={(v) => setFormData({ ...formData, cadence: v as Cadence })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(cadenceLabels) as Cadence[]).map((c) => (
                      <SelectItem key={c} value={c}>{cadenceLabels[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <Label>Activa</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !formData.name || !formData.amount}>
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSub ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
