import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MobileLayout } from "@/components/mobile";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AddIncomePageProps {
  user: User;
}

export function AddIncomePage({ user }: AddIncomePageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { toast } = useToast();

  const { data: allTransactions, create: createTransaction, update: updateTransaction, delete: deleteTransaction, isCreating } = useTransactions(user.id);
  const { create: createRecurring } = useRecurringTransactions(user.id);
  const { data: categories, create: createCategory, isCreating: isCreatingCategory } = useCategories(user.id, "general");
  const { data: accounts, create: createAccount, isCreating: isCreatingAccount } = useBankAccounts(user.id);

  const [formData, setFormData] = useState({
    amount: "",
    currency: "EUR",
    date: new Date().toISOString().split("T")[0],
    category_id: "none",
    bank_account_id: "none",
    description: "",
  });
  const [isRecurring, setIsRecurring] = useState(false);

  // Dialog States
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("EUR");

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const id = await createCategory({
        scope: "general",
        name: newCategoryName.trim(),
        sort_order: categories ? categories.length : 0,
        is_archived: false,
      });
      setFormData(prev => ({ ...prev, category_id: id }));
      setIsCategoryDialogOpen(false);
      setNewCategoryName("");
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    try {
      const id = await createAccount({
        name: newAccountName.trim(),
        currency: newAccountCurrency,
        initial_balance: 0,
        category_id: null,
        is_archived: false,
      });
      setFormData(prev => ({ ...prev, bank_account_id: id }));
      setIsAccountDialogOpen(false);
      setNewAccountName("");
    } catch (e) {
      // Error handled in hook
    }
  };

  useEffect(() => {
    if (searchParams.get("recurring") === "true") {
      setIsRecurring(true);
    }
  }, [searchParams]);

  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing transaction if editing
  useEffect(() => {
    if (editId && allTransactions) {
      const existing = allTransactions.find(t => t.id === editId);
      if (existing) {
        setFormData({
          amount: existing.amount.toString(),
          currency: existing.currency,
          date: existing.date.split("T")[0],
          category_id: existing.category_id || "none",
          bank_account_id: existing.bank_account_id || "none",
          description: existing.description || "",
        });
      }
    }
  }, [editId, allTransactions]);

  const handleSubmit = async () => {
    if (!formData.amount) return;
    setIsSubmitting(true);

    try {
      const payload = {
        type: "income" as const,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: new Date(formData.date).toISOString(),
        value_date: null,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
        description: formData.description || null,
      };

      if (editId) {
        await updateTransaction({ id: editId, ...payload });
        toast({ title: "Ingreso actualizado" });
      } else {
        if (isRecurring) {
          // Only create recurring template, NO transaction
          await createRecurring({
            type: "income",
            name: formData.description || "Ingreso recurrente",
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
        } else {
          // Normal transaction
          await createTransaction(payload);
        }
      }

      navigate(-1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    setIsSubmitting(true);
    try {
      await deleteTransaction(editId);
      toast({ title: "Ingreso eliminado" });
      navigate(-1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <h1 className="text-lg font-semibold">{editId ? "Editar Ingreso" : "Nuevo Ingreso"}</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Amount & Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Importe</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
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

        {/* Date */}
        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select
            value={formData.category_id}
            onValueChange={(v) => {
              if (v === "new") {
                setIsCategoryDialogOpen(true);
              } else {
                setFormData({ ...formData, category_id: v });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="text-primary font-medium bg-primary/10 mb-1">
                + Nueva categoría
              </SelectItem>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories?.filter(c => !c.is_archived).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account */}
        <div className="space-y-2">
          <Label>Cuenta</Label>
          <Select
            value={formData.bank_account_id}
            onValueChange={(v) => {
              if (v === "new") {
                setIsAccountDialogOpen(true);
              } else {
                setFormData({ ...formData, bank_account_id: v });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="text-primary font-medium bg-primary/10 mb-1">
                + Nueva cuenta
              </SelectItem>
              <SelectItem value="none">Sin cuenta</SelectItem>
              {accounts?.filter(a => !a.is_archived).map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            placeholder="Opcional"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </div>

        {/* Recurring Switch */}
        {!editId && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
            <div>
              <p className="font-medium">Hacer recurrente</p>
              <p className="text-sm text-muted-foreground">Repetir automáticamente</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}

        {/* Cadence */}
        {!editId && isRecurring && (
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

        {/* Buttons */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || isCreating || !formData.amount}
        >
          {(isSubmitting || isCreating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editId ? "Actualizar" : "Guardar"}
        </Button>

        {editId && (
          <Button
            variant="destructive"
            className="w-full"
            size="lg"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {/* Category Creation Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl top-[20%] translate-y-0">
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="catName" className="mb-2 block">Nombre</Label>
            <Input
              id="catName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ej: Transporte, Ocio..."
            />
          </div>
          <DialogFooter className="flex-row justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory || !newCategoryName.trim()}>
              {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Creation Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl top-[20%] translate-y-0">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="accName" className="mb-2 block">Nombre</Label>
              <Input
                id="accName"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Ej: BBVA, Efectivo..."
              />
            </div>
            <div>
              <Label htmlFor="accCurrency" className="mb-2 block">Moneda</Label>
              <Select value={newAccountCurrency} onValueChange={setNewAccountCurrency}>
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
          <DialogFooter className="flex-row justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAccount} disabled={isCreatingAccount || !newAccountName.trim()}>
              {isCreatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
