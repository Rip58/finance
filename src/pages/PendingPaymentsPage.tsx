import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Clock, Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileLayout } from "@/components/mobile";
import { useLoans, Loan } from "@/hooks/useLoans";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { format, differenceInMonths, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

interface PendingPaymentsPageProps {
  user: User;
}

export function PendingPaymentsPage({ user }: PendingPaymentsPageProps) {
  const navigate = useNavigate();
  const { loans, pendingPayments, isLoading, create, update, delete: deleteLoan, payInstallment, isPaying, isCreating, isUpdating } = useLoans(user.id);
  const { data: accounts, create: createAccount, isCreating: isCreatingAccount } = useBankAccounts(user.id);
  const { data: categories, create: createCategory, isCreating: isCreatingCategory } = useCategories(user.id, "expense");
  const { create: createRecurring } = useRecurringTransactions(user.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    total_amount: "",
    monthly_payment: "",
    total_installments: "",
    paid_installments: "0",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    category_id: "none",
    bank_account_id: "none",
    currency: "EUR",
    notes: "",
  });

  // Inline creation dialogs
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("EUR");

  const resetForm = () => {
    setFormData({
      name: "",
      total_amount: "",
      monthly_payment: "",
      total_installments: "",
      paid_installments: "0",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      category_id: "none",
      bank_account_id: "none",
      currency: "EUR",
      notes: "",
    });
    setEditingLoan(null);
  };

  const openEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      name: loan.name,
      total_amount: loan.total_amount.toString(),
      monthly_payment: loan.monthly_payment.toString(),
      total_installments: loan.total_installments.toString(),
      paid_installments: loan.paid_installments.toString(),
      start_date: loan.start_date,
      end_date: loan.end_date,
      category_id: loan.category_id || "none",
      bank_account_id: loan.bank_account_id || "none",
      currency: loan.currency,
      notes: loan.notes || "",
    });
    setIsDialogOpen(true);
  };

  // Auto-calculate end date and installments when monthly payment and dates change
  const handleFormChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-calculate total installments from dates
    if ((field === "start_date" || field === "end_date") && newData.start_date && newData.end_date) {
      const months = differenceInMonths(new Date(newData.end_date), new Date(newData.start_date));
      if (months > 0) {
        newData.total_installments = months.toString();
      }
    }
    
    setFormData(newData);
  };

  const handleSubmit = async () => {
    const paidInstallments = parseInt(formData.paid_installments) || 0;
    const nextPaymentDate = addMonths(new Date(formData.start_date), paidInstallments);
    
    const loanData = {
      name: formData.name,
      total_amount: parseFloat(formData.total_amount),
      monthly_payment: parseFloat(formData.monthly_payment),
      total_installments: parseInt(formData.total_installments),
      paid_installments: paidInstallments,
      start_date: formData.start_date,
      end_date: formData.end_date,
      next_payment_date: format(nextPaymentDate, "yyyy-MM-dd"),
      category_id: formData.category_id === "none" ? null : formData.category_id,
      bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
      currency: formData.currency,
      notes: formData.notes || null,
      is_active: true,
    };

    if (editingLoan) {
      await update({ id: editingLoan.id, ...loanData });
    } else {
      await create(loanData);
      
      // Create recurring expense for the loan
      await createRecurring({
        type: "expense",
        name: formData.name + " (cuota)",
        amount: parseFloat(formData.monthly_payment),
        currency: formData.currency,
        category_id: formData.category_id === "none" ? null : formData.category_id,
        bank_account_id: formData.bank_account_id === "none" ? null : formData.bank_account_id,
        cadence: "monthly",
        start_date: formData.start_date,
        next_occurrence_date: format(nextPaymentDate, "yyyy-MM-dd"),
        is_active: true,
        notes: `Cuota préstamo: ${formData.name}`,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newId = await createCategory({
      name: newCategoryName.trim(),
      scope: "expense",
      sort_order: 0,
      is_archived: false,
    });
    setFormData(prev => ({ ...prev, category_id: newId }));
    setShowNewCategoryDialog(false);
    setNewCategoryName("");
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    const newId = await createAccount({
      name: newAccountName.trim(),
      currency: newAccountCurrency,
      category_id: null,
      is_archived: false,
      initial_balance: 0,
    });
    setFormData(prev => ({ ...prev, bank_account_id: newId }));
    setShowNewAccountDialog(false);
    setNewAccountName("");
    setNewAccountCurrency("EUR");
  };

  const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency === "USDT" ? "USD" : currency,
    }).format(value);

  const getAccountName = (id: string | null) => 
    id ? accounts?.find(a => a.id === id)?.name || "-" : "-";

  if (isLoading) {
    return (
      <MobileLayout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <h1 className="text-lg font-semibold">Pagos Pendientes</h1>
        </div>
        <Button size="icon" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Pending Payments Section */}
        {pendingPayments.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Cuotas por pagar
            </h2>
            {pendingPayments.map(({ loan, dueDate }) => (
              <div
                key={loan.id}
                className="p-4 rounded-2xl bg-warning/5 border border-warning/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{loan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {format(new Date(dueDate), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <span className="font-semibold text-warning">
                    {formatCurrency(loan.monthly_payment, loan.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1">
                    <Progress 
                      value={(loan.paid_installments / loan.total_installments) * 100} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {loan.paid_installments}/{loan.total_installments}
                  </span>
                  <Button 
                    size="sm" 
                    onClick={() => payInstallment(loan)}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-1">Pagar</span>
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* All Loans Section */}
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Préstamos activos
          </h2>
          {loans.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No hay préstamos</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir préstamo
              </Button>
            </div>
          ) : (
            loans.map((loan) => (
              <div
                key={loan.id}
                className="p-4 rounded-2xl bg-card border border-border/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{loan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getAccountName(loan.bank_account_id)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(loan.total_amount, loan.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(loan.monthly_payment, loan.currency)}/mes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Progress 
                    value={(loan.paid_installments / loan.total_installments) * 100} 
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    {loan.paid_installments}/{loan.total_installments}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {format(new Date(loan.start_date), "MMM yyyy", { locale: es })} - {format(new Date(loan.end_date), "MMM yyyy", { locale: es })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(loan)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar préstamo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteLoan(loan.id)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Create/Edit Loan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLoan ? "Editar préstamo" : "Nuevo préstamo"}</DialogTitle>
            <DialogDescription>
              {editingLoan ? "Modifica los datos" : "Añade un nuevo préstamo o financiación"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Ej: Préstamo coche"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Importe total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => handleFormChange("total_amount", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cuota mensual</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monthly_payment}
                  onChange={(e) => handleFormChange("monthly_payment", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Total cuotas</Label>
                <Input
                  type="number"
                  value={formData.total_installments}
                  onChange={(e) => handleFormChange("total_installments", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cuotas pagadas</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.paid_installments}
                  onChange={(e) => handleFormChange("paid_installments", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={formData.currency} onValueChange={(v) => handleFormChange("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => {
                  if (v === "new") {
                    setShowNewCategoryDialog(true);
                  } else {
                    handleFormChange("category_id", v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories?.filter(c => !c.is_archived).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary font-medium">
                    + Añadir nueva
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta de cargo</Label>
              <Select 
                value={formData.bank_account_id} 
                onValueChange={(v) => {
                  if (v === "new") {
                    setShowNewAccountDialog(true);
                  } else {
                    handleFormChange("bank_account_id", v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cuenta</SelectItem>
                  {accounts?.filter(a => !a.is_archived).map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary font-medium">
                    + Añadir nueva
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isCreating || isUpdating || !formData.name || !formData.total_amount || !formData.monthly_payment}
            >
              {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingLoan ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <Input 
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nombre de la categoría"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewCategoryDialog(false); setNewCategoryName(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim() || isCreatingCategory}>
              {isCreatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Account Dialog */}
      <Dialog open={showNewAccountDialog} onOpenChange={setShowNewAccountDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input 
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Nombre de la cuenta"
              autoFocus
            />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewAccountDialog(false); setNewAccountName(""); setNewAccountCurrency("EUR"); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAccount} disabled={!newAccountName.trim() || isCreatingAccount}>
              {isCreatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
