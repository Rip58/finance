import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import {
  MobileLayout,
  MobilePageHeader,
} from "@/components/mobile";
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

export function ReportPage({ user }: ReportPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [debtDialogType, setDebtDialogType] = useState<'pay' | 'receive' | null>(null);

  const { recurring, confirmations, confirm, unconfirm, update: updateRecurring, isConfirming } = useRecurringTransactions(user.id);
  const { data: categories = [] } = useCategories(user.id, undefined);
  const { data: accounts = [] } = useBankAccounts(user.id);

  // Helper to identify if an item is a loan or debt
  const isLoan = (item: RecurringTransaction) => {
    // Check fields first (more reliable if they exist)
    // If it has a person assigned, it's definitely a personal debt
    if (item.person) return true;
    if (item.loan_total_payments && item.loan_total_payments > 0) return true;

    if (item.type !== "expense") return false;
    const cat = categories.find(c => c.id === item.category_id);
    if (!cat) return false;
    const name = cat.name.toLowerCase();
    return name.includes("préstamo") || name.includes("prestamo") || name.includes("hipoteca");
  };

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    return recurring.filter(item => {
      if (!item.is_active) return false; // Only active templates

      if (activeTab === "debt_pay") {
        return isLoan(item) && item.type === 'expense';
      }
      if (activeTab === "debt_collect") {
        return isLoan(item) && item.type === 'income';
      }
      if (activeTab === "income") return item.type === "income"; // Show all incomes, including debts to receive
      if (activeTab === "expense") return item.type === "expense"; // Show all expenses, including debts to pay
      return false;
    });
  }, [recurring, activeTab, categories]);

  // Determine status for the CURRENT MONTH
  const currentMonthItems = useMemo(() => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    return filteredItems.map(item => {
      const confirmation = confirmations.find(c =>
        c.recurring_id === item.id &&
        isSameMonth(parseISO(c.occurrence_date), today)
      );

      const nextDate = parseISO(item.next_occurrence_date);
      const isDue = nextDate <= currentMonthEnd;
      const isPaid = !!confirmation;

      const relevant = isPaid || isDue;

      return {
        ...item,
        isPaid,
        confirmationId: confirmation?.id,
        confirmationDate: confirmation?.occurrence_date,
        isRelevant: relevant
      };
    }).filter(i => i.isRelevant);
  }, [filteredItems, confirmations]);

  const handleCheck = async (item: typeof currentMonthItems[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) return;

    if (item.isPaid) {
      // Unconfirm (Undo)
      if (item.confirmationId && item.confirmationDate) {
        await unconfirm({
          confirmationId: item.confirmationId,
          recurringId: item.id,
          occurrenceDate: item.confirmationDate
        });

        // Decrement loan payments if applicable
        if (isLoan(item)) {
          const updateData: any = {
            id: item.id,
            loan_payments_made: Math.max(0, (item.loan_payments_made || 0) - 1)
          };
          if (item.loan_amount_paid !== null && item.loan_amount_paid !== undefined) {
            updateData.loan_amount_paid = Math.max(0, item.loan_amount_paid - item.amount);
          }
          await updateRecurring(updateData);
        }
      }
    } else {
      // Confirm (Pay)
      await confirm({
        recurring: {
          ...item,
          occurrence_date: item.next_occurrence_date
        } as PendingRecurring
      });

      // Increment loan payments if applicable
      if (isLoan(item)) {
        const updateData: any = {
          id: item.id,
          loan_payments_made: (item.loan_payments_made || 0) + 1
        };
        if (item.loan_amount_paid !== null && item.loan_amount_paid !== undefined) {
          updateData.loan_amount_paid = item.loan_amount_paid + item.amount;
        }
        await updateRecurring(updateData);
      }
    }
  };

  const handleEdit = (item: typeof currentMonthItems[0]) => {
    const path = item.type === 'income' ? '/add-income' : '/add-expense';
    navigate(`${path}?edit=${item.id}&recurring=true`);
  };

  const totals = useMemo(() => {
    // If showing Loans/Debts, we calculate the GLOBAL status
    if (activeTab === 'debt_pay' || activeTab === 'debt_collect') {
      let loanTotal = 0; // Total Debt Value
      let loanPaid = 0;  // Total Amount Paid So Far

      // Calculate from ALL filtered loan items, not just current month (though usually they are the same items)
      filteredItems.forEach(item => {
        const totalAmount = item.loan_total_amount || (item.amount * (item.loan_total_payments || 1));
        const paidAmount = item.loan_amount_paid !== null && item.loan_amount_paid !== undefined
          ? item.loan_amount_paid
          : ((item.loan_payments_made || 0) * item.amount);

        loanTotal += totalAmount;
        loanPaid += paidAmount;
      });

      return {
        total: loanTotal,
        paid: loanPaid,
        pending: loanTotal - loanPaid
      };
    }

    // Default behavior for Income/Expense (Monthly View)
    const total = currentMonthItems.reduce((acc, item) => acc + item.amount, 0);
    const paid = currentMonthItems.filter(i => i.isPaid).reduce((acc, item) => acc + item.amount, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [currentMonthItems, filteredItems, activeTab]);

  // Group items by Account
  const groupedItems = useMemo(() => {
    const groups: { accountId: string | null; accountName: string; items: typeof currentMonthItems }[] = [];

    // Add known accounts
    accounts.forEach(acc => {
      groups.push({ accountId: acc.id, accountName: acc.name, items: [] });
    });
    // Add General / Particulares
    groups.push({
      accountId: null,
      accountName: (activeTab === 'debt_pay' || activeTab === 'debt_collect') ? "Particulares / Bancos" : "General",
      items: []
    });

    currentMonthItems.forEach(item => {
      let placed = false;
      if (item.bank_account_id) {
        const g = groups.find(g => g.accountId === item.bank_account_id);
        if (g) {
          g.items.push(item);
          placed = true;
        }
      }
      if (!placed) {
        const g = groups.find(g => g.accountId === null);
        if (g) g.items.push(item);
      }
    });

    // Sort items within groups: Yearly first, then others
    const cadenceOrder: Record<string, number> = {
      yearly: 0,
      quarterly: 1,
      monthly: 2,
      weekly: 3
    };

    groups.forEach(g => {
      g.items.sort((a, b) => {
        const orderA = cadenceOrder[a.cadence] ?? 99;
        const orderB = cadenceOrder[b.cadence] ?? 99;
        return orderA - orderB;
      });
    });

    return groups.filter(g => g.items.length > 0);
  }, [currentMonthItems, accounts]);

  const currentMonthName = format(new Date(), "MMMM", { locale: es });

  const CreateAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Plus className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-popover/95 backdrop-blur-md border-border mr-2">
        <DropdownMenuItem
          className="rounded-xl p-3 focus:bg-accent focus:text-accent-foreground cursor-pointer text-base"
          onClick={() => navigate("/add-income?recurring=true")}
        >
          Nuevo Ingreso
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl p-3 focus:bg-accent focus:text-accent-foreground cursor-pointer text-base"
          onClick={() => navigate("/add-expense?recurring=true")}
        >
          Nuevo Gasto
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl p-3 focus:bg-accent focus:text-accent-foreground cursor-pointer text-base"
          onClick={() => navigate("/add-expense?recurring=true&hint=bank_loan")}
        >
          Nuevo Préstamo
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl p-3 focus:bg-accent focus:text-accent-foreground cursor-pointer text-base"
          onClick={() => setDebtDialogType('pay')}
        >
          Nueva Deuda
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl p-3 focus:bg-accent focus:text-accent-foreground cursor-pointer text-base"
          onClick={() => setDebtDialogType('receive')}
        >
          Nuevo Cobro
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MobileLayout>
      <MobilePageHeader title="Informe visual" showBack rightAction={CreateAction} />

      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Centered Tabs */}
        <div className="px-4 mt-2 mb-2">
          <div className="grid grid-cols-4 p-1 bg-secondary/50 rounded-2xl w-full gap-1">
            <button
              onClick={() => setActiveTab("expense")}
              className={cn(
                "px-0 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                activeTab === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Gastos
            </button>
            <button
              onClick={() => setActiveTab("income")}
              className={cn(
                "px-0 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                activeTab === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Ingresos
            </button>
            <button
              onClick={() => setActiveTab("debt_pay")}
              className={cn(
                "px-0 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                activeTab === "debt_pay"
                  ? "bg-red-100 text-red-700 shadow-sm border border-red-200"
                  : "text-muted-foreground hover:text-red-700/70"
              )}
            >
              Deudas
            </button>
            <button
              onClick={() => setActiveTab("debt_collect")}
              className={cn(
                "px-0 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
                activeTab === "debt_collect"
                  ? "bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200"
                  : "text-muted-foreground hover:text-emerald-700/70"
              )}
            >
              Cobrar
            </button>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="px-4 py-2 grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card/50 border border-border/50 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total</p>
            <p className="font-bold text-foreground">{formatCurrency(totals.total)}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-green-600/80 uppercase tracking-wide mb-1">Pagado</p>
            <p className="font-bold text-green-600">{formatCurrency(totals.paid)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-center">
            <p className="text-[10px] text-red-600/80 uppercase tracking-wide mb-1">Pendiente</p>
            <p className="font-bold text-red-600">{formatCurrency(totals.pending)}</p>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-6 pb-20 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-medium capitalize">{currentMonthName}</h3>
            <span className="text-xs text-muted-foreground">{currentMonthItems.length} elementos</span>
          </div>

          {groupedItems.length > 0 ? (
            groupedItems.map((group) => (
              <div key={group.accountId || 'general'} className="space-y-2">
                {/* Group Header */}
                <div className="px-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 mt-4 first:mt-0">
                  <div className="inline-block px-4 py-1.5 rounded-xl bg-secondary/80 border border-border/50 shadow-sm backdrop-blur-md">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">
                      {group.accountName}
                    </h4>
                  </div>
                </div>

                {/* Items - Grid Layout (2 cols) */}
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleEdit(item)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 hover:bg-accent/5 cursor-pointer",
                        item.isPaid
                          ? "bg-muted/30 border-transparent opacity-60"
                          : "bg-card border-border shadow-sm"
                      )}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={cn("text-xs font-semibold truncate", item.isPaid && "line-through text-muted-foreground")}>
                          {item.name}
                        </p>

                        {/* PROGRESS BAR LOGIC */}
                        {/* CASE 1: FIXED LOAN (Segmented Bar) */}
                        {(activeTab === 'debt_pay' || activeTab === 'debt_collect' || (item.loan_total_amount && item.loan_total_amount > 0)) && (item.loan_total_payments && item.loan_total_payments > 0) && (
                          <div className="flex gap-0.5 mt-1.5 w-full h-1.5">
                            {Array.from({ length: Math.min(20, item.loan_total_payments) }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-full flex-1 rounded-full",
                                  i < (item.loan_payments_made || 0) ? "bg-green-500" : "bg-muted-foreground/20"
                                )}
                              />
                            ))}
                          </div>
                        )}

                        {/* CASE 2: MANUAL DEBT (Continuous Bar) - Only if some payment made */}
                        {(activeTab === 'debt_pay' || activeTab === 'debt_collect' || (item.loan_total_amount && item.loan_total_amount > 0)) && (!item.loan_total_payments || item.loan_total_payments === 0) && (
                          <div className="mt-1.5 w-full h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                ((item.loan_amount_paid || 0) / (item.loan_total_amount || 1)) >= 1 ? "bg-green-500" :
                                  ((item.loan_amount_paid || 0) / (item.loan_total_amount || 1)) > 0.5 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(100, Math.max(5, ((item.loan_amount_paid || 0) / (item.loan_total_amount || 1)) * 100))}%` }}
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {/* For loans, show remaining amount. For others, show item amount */}
                            {(activeTab === 'debt_pay' || activeTab === 'debt_collect' || (item.loan_total_amount && item.loan_total_amount > 0))
                              ? <span className={cn(
                                "font-medium",
                                ((item.loan_total_amount || 0) - (item.loan_amount_paid || 0)) <= 0.01 ? "text-green-600" : "text-red-500"
                              )}>
                                {formatCurrency((item.loan_total_amount || 0) - (item.loan_amount_paid || 0))}
                              </span>
                              : formatCurrency(item.amount)
                            }

                            {/* TEXT LOGIC */}
                            {/* Case 1: Fixed Loan -> (2/12) */}
                            {(activeTab === 'debt_pay' || activeTab === 'debt_collect' || (item.loan_total_amount && item.loan_total_amount > 0)) && (item.loan_total_payments && item.loan_total_payments > 0) && (
                              <span className="text-[10px] opacity-70 ml-1">
                                ({item.loan_payments_made || 0}/{item.loan_total_payments})
                              </span>
                            )}

                            {/* Case 2: Manual Debt -> (2 aportaciones) */}
                            {(activeTab === 'debt_pay' || activeTab === 'debt_collect' || (item.loan_total_amount && item.loan_total_amount > 0)) && (!item.loan_total_payments || item.loan_total_payments === 0) && (
                              <span className="text-[10px] opacity-70 ml-1">
                                ({item.loan_payments_made || 0} aportaciones)
                              </span>
                            )}
                          </span>

                          {/* Show Person Name if available */}
                          {item.person && (
                            <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                              {item.type === 'income' ? 'Te debe:' : 'Debes a:'} {item.person}
                            </span>
                          )}

                          {item.cadence !== 'monthly' && (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 w-fit">
                              {item.cadence === 'yearly' ? 'Anual' : item.cadence}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {activeTab !== 'debt_pay' && activeTab !== 'debt_collect' && (
                        <Button
                          size="icon"
                          variant={item.isPaid ? "ghost" : "default"}
                          className={cn(
                            "h-7 w-7 rounded-full shrink-0 transition-all",
                            item.isPaid
                              ? "text-muted-foreground bg-muted hover:bg-muted"
                              : "bg-primary text-primary-foreground hover:scale-105 shadow-glow-primary"
                          )}
                          onClick={(e) => handleCheck(item, e)}
                          disabled={isConfirming}
                        >
                          {item.isPaid ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border-2 border-current" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
              <p className="text-muted-foreground text-sm">No hay elementos configurados para este mes</p>
            </div>
          )}
        </div>
      </div >


      <DebtFormDialog
        isOpen={!!debtDialogType}
        onClose={() => setDebtDialogType(null)}
        type={debtDialogType}
        userId={user.id}
      />
    </MobileLayout >
  );
}
