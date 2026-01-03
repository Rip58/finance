import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileLayout } from "@/components/mobile";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import type { User } from "@supabase/supabase-js";

interface AddIncomePageProps {
  user: User;
}

export function AddIncomePage({ user }: AddIncomePageProps) {
  const navigate = useNavigate();
  const { create: createTransaction, isCreating } = useTransactions(user.id);
  const { create: createRecurring } = useRecurringTransactions(user.id);
  const { data: categories } = useCategories(user.id, "income");
  const { data: accounts } = useBankAccounts(user.id);

  const [formData, setFormData] = useState({
    amount: "",
    currency: "EUR",
    date: new Date().toISOString().split("T")[0],
    category_id: "none",
    bank_account_id: "none",
    description: "",
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.amount) return;
    setIsSubmitting(true);

    try {
      // Create the transaction
      await createTransaction({
        type: "income",
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: new Date(formData.date).toISOString(),
        value_date: null,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
        description: formData.description || null,
      });

      // If recurring, also create the recurring template
      if (isRecurring) {
        createRecurring({
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
      }

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
          <h1 className="text-lg font-semibold">Nuevo Ingreso</h1>
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

        {/* Account */}
        <div className="space-y-2">
          <Label>Cuenta</Label>
          <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Sin cuenta" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
          <div>
            <p className="font-medium">Hacer recurrente</p>
            <p className="text-sm text-muted-foreground">Repetir automáticamente</p>
          </div>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </div>

        {/* Cadence (if recurring) */}
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

        {/* Submit */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleSubmit}
          disabled={isSubmitting || isCreating || !formData.amount}
        >
          {(isSubmitting || isCreating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </MobileLayout>
  );
}
