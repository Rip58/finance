import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";
import { useRecurringTransactions, type RecurringTransaction, type PendingRecurring } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { startOfMonth, endOfMonth, isSameMonth, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { DebtFormDialog } from "@/components/mobile/DebtFormDialog";

interface ReportPageProps {
  user: User;
}

type TabType = "income" | "expense" | "debt_pay" | "debt_collect";

const TAB_CONFIG: { id: TabType; label: string; activeClass: string }[] = [
  { id: "expense", label: "Gastos", activeClass: "bg-orange-500/20 text-orange-600 shadow-sm" },
  { id: "income", label: "Ingresos", activeClass: "bg-blue-500/20 text-blue-600 shadow-sm" },
  { id: "debt_pay", label: "Deudas", activeClass: "bg-red-500/20 text-red-600 shadow-sm" },
  { id: "debt_collect", label: "Cobrar", activeClass: "bg-emerald-500/20 text-emerald-600 shadow-sm" },
];

export function ReportPage({ user }: ReportPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [debtDialogType, setDebtDialogType] = useState<'pay' | 'receive' | null>(null);

  const { recurring, confirmations, confirm, unconfirm, update: updateRecurring, isConfirming } = useRecurringTransactions(user.id);
  const { data: categories = [] } = useCategories(user.id, undefined);
  const { data: accounts = [] } = useBankAccounts(user.id);

  const isLoan = (item: RecurringTransaction) => {
    if (item.person) return true;
    if (item.loan_total_payments && item.loan_total_payments > 0) return true;
    if (item.type !== "expense") return false;
    const cat = categories.find(c => c.id === item.category_id);
    if (!cat) return false;
    const name = cat.name.toLowerCase();
    return name.includes("préstamo") || name.includes("prestamo") || name.includes("hipoteca");
  };

  const filteredItems = useMemo(() => {
    return recurring.filter(item => {
      if (!item.is_active) return false;
      if (activeTab === "debt_pay") return isLoan(item) && item.type === 'expense';
      if (activeTab === "debt_collect") return isLoan(item) && item.type === 'income';
      if (activeTab === "income") return item.type === "income";
      if (activeTab === "expense") return item.type === "expense";
      return false;
    });
  }, [recurring, activeTab, categories]);

  const currentMonthItems = useMemo(() => {
    const today = new Date();
    const currentMonthEnd = endOfMonth(today);

    return filteredItems.map(item => {
      const confirmation = confirmations.find(c =>
        c.recurring_id === item.id &&
        isSameMonth(parseISO(c.occurrence_date), today)
      );
      const nextDate = parseISO(item.next_occurrence_date);
      const isDue = nextDate <= currentMonthEnd;
      const isPaid = !!confirmation;
      return {
        ...item,
        isPaid,
        confirmationId: confirmation?.id,
        confirmationDate: confirmation?.occurrence_date,
        isRelevant: isPaid || isDue
      };
    }).filter(i => i.isRelevant);
  }, [filteredItems, confirmations]);

  const handleCheck = async (item: typeof currentMonthItems[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) return;

    if (item.isPaid) {
      if (item.confirmationId && item.confirmationDate) {
        await unconfirm({ confirmationId: item.confirmationId, recurringId: item.id, occurrenceDate: item.confirmationDate });
        if (isLoan(item)) {
          const updateData: any = { id: item.id, loan_payments_made: Math.max(0, (item.loan_payments_made || 0) - 1) };
          if (item.loan_amount_paid != null) updateData.loan_amount_paid = Math.max(0, item.loan_amount_paid - item.amount);
          await updateRecurring(updateData);
        }
      }
    } else {
      await confirm({ recurring: { ...item, occurrence_date: item.next_occurrence_date } as PendingRecurring });
      if (isLoan(item)) {
        const updateData: any = { id: item.id, loan_payments_made: (item.loan_payments_made || 0) + 1 };
        if (item.loan_amount_paid != null) updateData.loan_amount_paid = item.loan_amount_paid + item.amount;
        await updateRecurring(updateData);
      }
    }
  };

  const handleEdit = (item: typeof currentMonthItems[0]) => {
    const path = item.type === 'income' ? '/add-income' : '/add-expense';
    navigate(`${path}?edit=${item.id}&recurring=true`);
  };

  const totals = useMemo(() => {
    if (activeTab === 'debt_pay' || activeTab === 'debt_collect') {
      let loanTotal = 0, loanPaid = 0;
      filteredItems.forEach(item => {
        loanTotal += item.loan_total_amount || (item.amount * (item.loan_total_payments || 1));
        loanPaid += item.loan_amount_paid != null ? item.loan_amount_paid : (item.loan_payments_made || 0) * item.amount;
      });
      return { total: loanTotal, paid: loanPaid, pending: loanTotal - loanPaid };
    }
    const total = currentMonthItems.reduce((acc, i) => acc + i.amount, 0);
    const paid = currentMonthItems.filter(i => i.isPaid).reduce((acc, i) => acc + i.amount, 0);
    return { total, paid, pending: total - paid };
  }, [currentMonthItems, filteredItems, activeTab]);

  const groupedItems = useMemo(() => {
    const groups: { accountId: string | null; accountName: string; items: typeof currentMonthItems }[] = [];
    accounts.forEach(acc => groups.push({ accountId: acc.id, accountName: acc.name, items: [] }));
    groups.push({
      accountId: null,
      accountName: (activeTab === 'debt_pay' || activeTab === 'debt_collect') ? "Particulares / Bancos" : "General",
      items: []
    });

    const cadenceOrder: Record<string, number> = { yearly: 0, quarterly: 1, monthly: 2, weekly: 3 };

    currentMonthItems.forEach(item => {
      let placed = false;
      if (item.bank_account_id) {
        const g = groups.find(g => g.accountId === item.bank_account_id);
        if (g) { g.items.push(item); placed = true; }
      }
      if (!placed) {
        const g = groups.find(g => g.accountId === null);
        if (g) g.items.push(item);
      }
    });

    groups.forEach(g => g.items.sort((a, b) => (cadenceOrder[a.cadence] ?? 99) - (cadenceOrder[b.cadence] ?? 99)));
    return groups.filter(g => g.items.length > 0);
  }, [currentMonthItems, accounts]);

  const currentMonthName = format(new Date(), "MMMM yyyy", { locale: es });
  const isDebtTab = activeTab === 'debt_pay' || activeTab === 'debt_collect';

  const CreateAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className="h-8 w-8 rounded-lg">
          <Plus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm cursor-pointer" onClick={() => navigate("/add-income?recurring=true")}>
          Nuevo Ingreso
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm cursor-pointer" onClick={() => navigate("/add-expense?recurring=true")}>
          Nuevo Gasto
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm cursor-pointer" onClick={() => navigate("/add-expense?recurring=true&hint=bank_loan")}>
          Nuevo Préstamo
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm cursor-pointer" onClick={() => setDebtDialogType('pay')}>
          Nueva Deuda
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-3 py-2 text-sm cursor-pointer" onClick={() => setDebtDialogType('receive')}>
          Nuevo Cobro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MobileLayout>
      <div className="container mx-auto p-4 space-y-4 pb-20 fade-in safe-area-pt">

        {/* Header inline */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">Informe Mensual</h1>
            <p className="text-[11px] text-muted-foreground capitalize">{currentMonthName}</p>
          </div>
          {CreateAction}
        </div>

        {/* Pill-bar tabs */}
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl w-full">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === tab.id ? tab.activeClass : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">Total</p>
            <p className="font-bold text-xs">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl py-2 px-3 text-center">
            <p className="text-[9px] text-green-600/80 uppercase tracking-wide mb-0.5">
              {isDebtTab ? "Pagado" : "Confirmado"}
            </p>
            <p className="font-bold text-xs text-green-600">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-3 text-center">
            <p className="text-[9px] text-red-600/80 uppercase tracking-wide mb-0.5">Pendiente</p>
            <p className="font-bold text-xs text-red-600">{formatCurrency(totals.pending)}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-4 pb-20">
          {groupedItems.length > 0 ? (
            groupedItems.map((group, gi) => (
              <div key={group.accountId || 'general'}>
                {/* Group separator */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium truncate max-w-[60%]">
                    {group.accountName}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-muted-foreground shrink-0">{group.items.length}</span>
                </div>

                {/* Rows */}
                <div className="space-y-1.5">
                  {group.items.map(item => {
                    const debtPct = item.loan_total_amount
                      ? Math.min(1, (item.loan_amount_paid || 0) / item.loan_total_amount)
                      : 0;
                    const remainingDebt = (item.loan_total_amount || 0) - (item.loan_amount_paid || 0);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleEdit(item)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
                          item.isPaid
                            ? "bg-muted/20 border-transparent opacity-60"
                            : "bg-card/40 border-border/40 hover:bg-card/70"
                        )}
                      >
                        {/* Left: name + meta */}
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold truncate leading-tight", item.isPaid && "line-through text-muted-foreground")}>
                            {item.name}
                          </p>

                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {/* Cadence badge */}
                            {item.cadence !== 'monthly' && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0">
                                {item.cadence === 'yearly' ? 'Anual' : item.cadence === 'quarterly' ? 'Trim.' : item.cadence}
                              </Badge>
                            )}
                            {/* Person for debt */}
                            {item.person && (
                              <span className="text-[10px] text-primary font-medium">
                                {item.type === 'income' ? 'Te debe' : 'Debes a'}: {item.person}
                              </span>
                            )}
                          </div>

                          {/* Progress bar for loans (fixed installments) */}
                          {isDebtTab && item.loan_total_payments && item.loan_total_payments > 0 && (
                            <div className="flex gap-0.5 mt-1.5 w-full h-1.5">
                              {Array.from({ length: Math.min(20, item.loan_total_payments) }).map((_, i) => (
                                <div
                                  key={i}
                                  className={cn("h-full flex-1 rounded-full", i < (item.loan_payments_made || 0) ? "bg-green-500" : "bg-muted-foreground/20")}
                                />
                              ))}
                            </div>
                          )}

                          {/* Progress bar for open debts */}
                          {isDebtTab && (!item.loan_total_payments || item.loan_total_payments === 0) && item.loan_total_amount && item.loan_total_amount > 0 && (
                            <div className="mt-1.5 w-full h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full transition-all duration-500", debtPct >= 1 ? "bg-green-500" : debtPct > 0.5 ? "bg-amber-500" : "bg-red-500")}
                                style={{ width: `${Math.min(100, Math.max(5, debtPct * 100))}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Center: amount */}
                        <div className="text-right shrink-0">
                          {isDebtTab && item.loan_total_amount ? (
                            <>
                              <p className={cn("text-sm font-bold", remainingDebt <= 0.01 ? "text-green-600" : "text-red-500")}>
                                {formatCurrency(Math.max(0, remainingDebt))}
                              </p>
                              {item.loan_total_payments && item.loan_total_payments > 0 && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {item.loan_payments_made || 0}/{item.loan_total_payments}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm font-bold">{formatCurrency(item.amount)}</p>
                          )}
                        </div>

                        {/* Right: check button (only for income/expense tabs) */}
                        {!isDebtTab && (
                          <button
                            onClick={(e) => handleCheck(item, e)}
                            disabled={isConfirming}
                            className={cn(
                              "h-8 w-8 rounded-full shrink-0 flex items-center justify-center transition-all border-2",
                              item.isPaid
                                ? "border-transparent bg-green-500/20 text-green-600"
                                : "border-border/60 bg-card text-muted-foreground hover:border-primary hover:text-primary"
                            )}
                          >
                            {item.isPaid
                              ? <Check className="h-3.5 w-3.5" />
                              : <div className="h-2.5 w-2.5 rounded-full border-2 border-current" />
                            }
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 rounded-xl border border-dashed border-border">
              <p className="text-muted-foreground text-sm">No hay elementos para este mes</p>
              <p className="text-xs text-muted-foreground mt-1">Pulsa + para añadir uno nuevo</p>
            </div>
          )}
        </div>

        <DebtFormDialog
          isOpen={!!debtDialogType}
          onClose={() => setDebtDialogType(null)}
          type={debtDialogType}
          userId={user.id}
        />
      </div>
    </MobileLayout>
  );
}
