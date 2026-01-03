import { useState } from "react";
import { useSubscriptions, Subscription, Cadence } from "@/hooks/useSubscriptions";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    category_id: "",
    bank_account_id: "",
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
      category_id: formData.category_id || null,
      bank_account_id: formData.bank_account_id || null,
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
      category_id: "",
      bank_account_id: "",
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
      category_id: sub.category_id || "",
      bank_account_id: sub.bank_account_id || "",
      is_active: sub.is_active,
      notes: sub.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getLastCharge = (subId: string) => {
    const subCharges = charges.filter(c => c.subscription_id === subId);
    if (subCharges.length === 0) return null;
    return subCharges.reduce((latest, c) => 
      new Date(c.charge_date) > new Date(latest.charge_date) ? c : latest
    );
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
          <CardTitle>Suscripciones</CardTitle>
          <CardDescription>Cargos recurrentes automáticos</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva suscripción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSub ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
              <DialogDescription>
                Los cargos se generan automáticamente como gastos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Netflix, Spotify..."
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
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
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
              <div className="flex items-center justify-between">
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
      </CardHeader>
      <CardContent>
        {subscriptions?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No hay suscripciones</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Cadencia</TableHead>
                  <TableHead>Próximo cargo</TableHead>
                  <TableHead>Último cargo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub) => {
                  const lastCharge = getLastCharge(sub.id);
                  return (
                    <TableRow key={sub.id} className={!sub.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>{sub.amount} {sub.currency}</TableCell>
                      <TableCell>{cadenceLabels[sub.cadence]}</TableCell>
                      <TableCell>{format(new Date(sub.next_charge_date), "dd MMM yyyy", { locale: es })}</TableCell>
                      <TableCell>
                        {lastCharge ? format(new Date(lastCharge.charge_date), "dd MMM yyyy", { locale: es }) : "-"}
                      </TableCell>
                      <TableCell>
                        {sub.is_active ? (
                          <Badge variant="default" className="bg-success">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Pausada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(sub)}>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
