import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileLayout } from "@/components/mobile";
import { useTransfers } from "@/hooks/useTransfers";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useFxRates } from "@/hooks/useFxRates";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface AddTransferPageProps {
  user: User;
}

export function AddTransferPage({ user }: AddTransferPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { toast } = useToast();

  const { data: allTransfers, create: createTransfer, update: updateTransfer, delete: deleteTransfer, isCreating } = useTransfers(user.id);
  const { create: createRecurring } = useRecurringTransactions(user.id);
  const { data: accounts } = useBankAccounts(user.id);
  const { getLatestRate } = useFxRates();

  const [formData, setFormData] = useState({
    from_account_id: "",
    to_account_id: "",
    amount_from: "",
    amount_to: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    fx_rate: null as number | null,
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = accounts?.filter(a => !a.is_archived) || [];
  const fromAccount = activeAccounts.find(a => a.id === formData.from_account_id);
  const toAccount = activeAccounts.find(a => a.id === formData.to_account_id);
  const needsConversion = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Load existing transfer if editing
  useEffect(() => {
    if (editId && allTransfers) {
      const existing = allTransfers.find(t => t.id === editId);
      if (existing) {
        setFormData({
          from_account_id: existing.from_account_id,
          to_account_id: existing.to_account_id,
          amount_from: existing.amount_from.toString(),
          amount_to: existing.amount_to.toString(),
          date: existing.date.split("T")[0],
          description: existing.description || "",
          fx_rate: existing.fx_rate,
        });
      }
    }
  }, [editId, allTransfers]);

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
    if (!formData.from_account_id || !formData.to_account_id || !formData.amount_from) return;
    if (!fromAccount || !toAccount) return;
    setIsSubmitting(true);

    try {
      const payload = {
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount_from: parseFloat(formData.amount_from),
        currency_from: fromAccount.currency,
        amount_to: parseFloat(formData.amount_to),
        currency_to: toAccount.currency,
        fx_rate: formData.fx_rate,
        date: new Date(formData.date).toISOString(),
        value_date: null,
        description: formData.description || null,
      };

      if (editId) {
        await updateTransfer({ id: editId, ...payload });
        toast({ title: "Transferencia actualizada" });
      } else {
        await createTransfer(payload);

        // If recurring, also create the recurring template
        if (isRecurring) {
          createRecurring({
            type: "income", // We use a special type indicator via notes
            name: formData.description || "Transferencia recurrente",
            amount: parseFloat(formData.amount_from),
            currency: fromAccount.currency,
            category_id: null,
            bank_account_id: formData.from_account_id,
            cadence,
            start_date: formData.date,
            next_occurrence_date: formData.date,
            is_active: true,
            notes: `TRANSFER:${formData.to_account_id}:${formData.amount_to}:${toAccount.currency}`,
          });
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
      await deleteTransfer(editId);
      toast({ title: "Transferencia eliminada" });
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
          <div className="h-8 w-8 rounded-full bg-chart-assets/10 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-chart-assets" />
          </div>
          <h1 className="text-lg font-semibold">{editId ? "Editar Transferencia" : "Nueva Transferencia"}</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* From Account */}
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

        {/* To Account */}
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

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Importe origen</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount_from}
              onChange={(e) => setFormData({ ...formData, amount_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Importe destino</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount_to}
              onChange={(e) => setFormData({ ...formData, amount_to: e.target.value })}
              disabled={!needsConversion}
            />
          </div>
        </div>

        {needsConversion && formData.fx_rate && (
          <p className="text-sm text-muted-foreground">
            1 USDT = {formData.fx_rate.toLocaleString("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} EUR
          </p>
        )}

        {/* Date */}
        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Input
            placeholder="Opcional"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Recurring Switch (only for new transfers) */}
        {!editId && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
            <div>
              <p className="font-medium">Hacer recurrente</p>
              <p className="text-sm text-muted-foreground">Repetir automáticamente</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}

        {/* Cadence (if recurring) */}
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

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || isCreating || !formData.from_account_id || !formData.to_account_id || !formData.amount_from}
        >
          {(isSubmitting || isCreating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editId ? "Actualizar" : "Guardar"}
        </Button>

        {/* Delete Button (only in edit mode) */}
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
    </MobileLayout>
  );
}
