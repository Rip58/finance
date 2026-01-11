import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, TrendingDown, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface AddExpensePageProps {
  user: User;
}

export function AddExpensePage({ user }: AddExpensePageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const { toast } = useToast();

  const { data: allTransactions, create: createTransaction, update: updateTransaction, delete: deleteTransaction, isCreating } = useTransactions(user.id);
  const { recurring: allRecurring, create: createRecurring, update: updateRecurring, delete: deleteRecurring } = useRecurringTransactions(user.id);
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
  const [cadence, setCadence] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loan Specific State
  const [loanData, setLoanData] = useState({
    totalAmount: "",
    totalPayments: "",
    paymentsMade: "0",
    personName: "",
    amountPaid: "0",
  });
  const [debtType, setDebtType] = useState<"manual" | "loan">("manual");
  const [forceDebt, setForceDebt] = useState(false);

  const [contribution, setContribution] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [contributionsList, setContributionsList] = useState<any[]>([]);
  const [editingContribIndex, setEditingContribIndex] = useState<number | null>(null);

  const selectedCategory = categories?.find(c => c.id === formData.category_id);
  const hint = searchParams.get("hint");
  const isBankLoan = hint === "bank_loan";
  const isPersonalDebt = hint === "personal_debt";
  const isLoan = isPersonalDebt || forceDebt || hint === "loan" ||
    selectedCategory?.name.toLowerCase().includes("préstamo") ||
    selectedCategory?.name.toLowerCase().includes("prestamo") ||
    selectedCategory?.name.toLowerCase().includes("deuda") ||
    (parseFloat(loanData.totalPayments) > 0);

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

    if (searchParams.get("hint") === "loan" && categories) {
      const loanCat = categories.find(c => {
        const n = c.name.toLowerCase();
        return n.includes("préstamo") || n.includes("prestamo") || n.includes("hipoteca");
      });
      if (loanCat) {
        setFormData(prev => ({ ...prev, category_id: loanCat.id }));
      }
    }
  }, [searchParams, categories]);

  // Load existing transaction if editing
  useEffect(() => {
    if (!editId) return;

    const isRecurringEdit = searchParams.get("recurring") === "true";

    if (isRecurringEdit && allRecurring) {
      const existing = allRecurring.find(t => t.id === editId);
      if (existing) {
        setFormData({
          amount: existing.amount.toString(),
          currency: existing.currency,
          date: existing.start_date ? existing.start_date : new Date().toISOString().split("T")[0],
          category_id: existing.category_id || "none",
          bank_account_id: existing.bank_account_id || "none",
          description: existing.name || "",
        });
        setIsRecurring(true);
        setCadence(existing.cadence as any);
        if (existing.loan_total_amount) setLoanData(prev => ({ ...prev, totalAmount: existing.loan_total_amount!.toString() }));
        if (existing.loan_total_payments) setLoanData(prev => ({ ...prev, totalPayments: existing.loan_total_payments!.toString() }));
        // Contributions load
        if (existing.contributions && Array.isArray(existing.contributions)) {
          setContributionsList(existing.contributions);
          // Calculate derived
          const paid = existing.contributions.reduce((sum: number, c: any) => sum + (parseFloat(c.amount) || 0), 0);
          setLoanData(prev => ({
            ...prev,
            amountPaid: paid.toFixed(2),
            paymentsMade: existing.contributions.length.toString()
          }));
        } else {
          // Fallback for old data
          if (existing.loan_payments_made) setLoanData(prev => ({ ...prev, paymentsMade: existing.loan_payments_made!.toString() }));
          if (existing.loan_amount_paid) setLoanData(prev => ({ ...prev, amountPaid: existing.loan_amount_paid!.toString() }));
        }
        if (existing.person) setLoanData(prev => ({ ...prev, personName: existing.person! }));

        // Initialize Debt Type and Force Debt Mode
        if (existing.cadence === 'manual') {
          setDebtType('manual');
          setForceDebt(true);
        } else if (existing.loan_total_payments && existing.loan_total_payments > 0) {
          setDebtType('loan');
          setForceDebt(true);
        }
      }
    } else if (allTransactions && !isRecurringEdit) {
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
  }, [editId, allTransactions, allRecurring, searchParams]);

  const handleAddContribution = () => {
    const amt = parseFloat(contribution.amount);
    if (!amt) return;

    let newList = [...contributionsList];
    if (editingContribIndex !== null) {
      newList[editingContribIndex] = { ...contribution, amount: contribution.amount }; // Ensure storing string or number consistently
      setEditingContribIndex(null);
    } else {
      newList.push({ ...contribution });
    }

    // Sort by date? Optional. User didn't ask, but good practice.
    newList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setContributionsList(newList);

    // Update derived stats
    const currentPaid = newList.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
    setLoanData(prev => ({
      ...prev,
      amountPaid: currentPaid.toFixed(2),
      paymentsMade: newList.length.toString()
    }));

    setContribution({ amount: "", date: new Date().toISOString().split('T')[0] });
    toast({ title: editingContribIndex !== null ? "Aportación actualizada" : "Aportación añadida" });
  };

  const handleEditContribution = (index: number) => {
    const item = contributionsList[index];
    setContribution({ amount: item.amount.toString(), date: item.date });
    setEditingContribIndex(index);
  };

  const handleDeleteContribution = (index: number) => {
    const newList = contributionsList.filter((_, i) => i !== index);
    setContributionsList(newList);

    const currentPaid = newList.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
    setLoanData(prev => ({
      ...prev,
      amountPaid: currentPaid.toFixed(2),
      paymentsMade: newList.length.toString()
    }));
  };

  const handleSubmit = async () => {
    if (!formData.amount) return;
    setIsSubmitting(true);

    try {
      // Payload for Transaction
      const payload = {
        type: "expense" as const,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        date: new Date(formData.date).toISOString(),
        value_date: null,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
        description: formData.description || null,
      };

      if (editId) {
        if (isRecurring) {
          // Construct update payload dynamically
          const updatePayload: any = {
            id: editId,
            name: formData.description || "Gasto recurrente",
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            category_id: formData.category_id === "none" ? null : formData.category_id,
            bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
            cadence,
            start_date: formData.date,
          };

          if (isLoan) {
            // Assuming installmentAmount, totalDebt, paidSoFar, editedId are defined elsewhere
            // This block replaces the original `if (isLoan)` block for recurring updates
            updatePayload.amount = parseFloat(formData.amount); // Use formData.amount for installment
            updatePayload.loan_total_amount = parseFloat(loanData.totalAmount) || null;
            updatePayload.loan_total_payments = parseInt(loanData.totalPayments) || null; // manual
            updatePayload.loan_payments_made = contributionsList.length;
            updatePayload.loan_amount_paid = parseFloat(loanData.amountPaid) || null;
            updatePayload.contributions = contributionsList; // Save list
            updatePayload.person = loanData.personName || null; // Keep person name
          }

          await updateRecurring(updatePayload); // Assuming updateRecurring takes updatePayload directly
          toast({ title: "Recurrencia y deuda actualizadas" });
        } else {
          // Update Normal Transaction
          await updateTransaction({ id: editId, ...payload });
          toast({ title: "Gasto actualizado" });
        }
      } else {
        if (isRecurring) {
          // Only create recurring template, NO transaction
          const createPayload: any = {
            type: "expense",
            name: formData.description || "Gasto recurrente",
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            category_id: formData.category_id === "none" ? null : formData.category_id,
            bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
            cadence,
            start_date: formData.date,
            next_occurrence_date: formData.date,
            is_active: true,
            notes: null,
          };

          if (isLoan) {
            createPayload.loan_total_amount = parseFloat(loanData.totalAmount) || null;
            createPayload.loan_total_payments = parseInt(loanData.totalPayments) || null;
            createPayload.loan_payments_made = parseInt(loanData.paymentsMade) || null;
            createPayload.loan_amount_paid = parseFloat(loanData.amountPaid) || null;
            createPayload.person = loanData.personName || null;
            createPayload.contributions = contributionsList; // Save list for new recurring loan
          }

          await createRecurring(createPayload);
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
      if (isRecurring) {
        await deleteRecurring(editId);
        toast({ title: "Plantilla eliminada" });
      } else {
        await deleteTransaction(editId);
        toast({ title: "Gasto eliminado" });
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
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold">
            {editId
              ? "Editar Gasto"
              : isBankLoan ? "Nuevo Préstamo" : isPersonalDebt ? "Nueva Deuda" : "Nuevo Gasto"}
          </h1>
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

        {/* Loan Specific Fields */}
        {isLoan && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
            <h3 className="text-sm font-medium text-primary">
              {isPersonalDebt ? "Detalles de Deuda" : "Detalles del Préstamo"}
            </h3>

            {/* Person Name - Only for Personal Debt */}
            {(isPersonalDebt || (!isBankLoan && loanData.personName)) && (
              <div className="space-y-2">
                <Label>Persona / Entidad (Opcional)</Label>
                <Input
                  placeholder="Ej: Juan..."
                  value={loanData.personName}
                  onChange={(e) => setLoanData({ ...loanData, personName: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-4">
              {/* Debt Type Selector */}
              <div className="bg-background/50 p-1 rounded-lg flex text-sm mb-2">
                <button
                  type="button"
                  onClick={() => setDebtType("manual")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all font-medium",
                    debtType === "manual" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Deuda Manual
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType("loan")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md transition-all font-medium",
                    debtType === "loan" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Préstamo (Cuotas)
                </button>
              </div>

              <div className="space-y-2">
                <Label>Importe Total del Préstamo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={loanData.totalAmount}
                  onChange={(e) => setLoanData({ ...loanData, totalAmount: e.target.value })}
                />
              </div>

              {/* Fields for Loan Type (Fixed Quotas) */}
              {debtType === "loan" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Pagos Totales</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ej: 24"
                      value={loanData.totalPayments}
                      onChange={(e) => setLoanData({ ...loanData, totalPayments: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pagos Efectuados</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ej: 0"
                      value={loanData.paymentsMade}
                      onChange={(e) => setLoanData({ ...loanData, paymentsMade: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Hidden Fields for Debts as per request (Only Manual Debts now) */}
            {/* 
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pagos Totales</Label>
                <Input type="number" value={loanData.totalPayments} onChange={(e) => setLoanData({ ...loanData, totalPayments: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pagos Efectuados</Label>
                <Input type="number" value={loanData.paymentsMade} onChange={(e) => setLoanData({ ...loanData, paymentsMade: e.target.value })} />
              </div>
            </div> 
            */}
            {/* Contribution Section */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Registrar Pago</Label>

              {/* List of Contributions */}
              {contributionsList.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {contributionsList.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-background/80 rounded-lg border border-border/50">
                      <span>{new Intl.DateTimeFormat('es-ES').format(new Date(c.date))}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(parseFloat(c.amount))}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditContribution(i)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContribution(i)}
                            className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <Input
                  type="number"
                  placeholder="Importe"
                  value={contribution.amount}
                  onChange={(e) => setContribution({ ...contribution, amount: e.target.value })}
                />
                <Input
                  type="date"
                  value={contribution.date}
                  onChange={(e) => setContribution({ ...contribution, date: e.target.value })}
                />
              </div>
              <Button onClick={handleAddContribution} type="button" variant="secondary" className="w-full h-8 text-xs" disabled={!contribution.amount}>
                + Registrar Pago
              </Button>
              <div className="mt-2 flex justify-between items-center text-sm bg-background/50 p-2 rounded-lg">
                <span className="text-muted-foreground">Total Pagado:</span>
                <span className="font-bold text-red-600">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(parseFloat(loanData.amountPaid) || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Switch - Hidden for Manual Debt (Auto-recurring manual), Shown for Loan */}
        {(!editId || isRecurring) && !isLoan && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
            <div>
              <p className="font-medium">Hacer recurrente</p>
              <p className="text-sm text-muted-foreground">Repetir automáticamente</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}

        {/* Recurrence Options for LOAN type (Restored) */}
        {isLoan && debtType === "loan" && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50">
            <div>
              <p className="font-medium">Hacer recurrente</p>
              <p className="text-sm text-muted-foreground">Repetir automáticamente</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>
        )}

        {/* Cadence */}
        {/* Cadence - Hidden for Loan */}
        {/* Cadence - Hidden for Manual Loan, Shown if Loan Type + Recurring */}
        {isRecurring && (!isLoan || (isLoan && debtType === "loan")) && (
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
