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

interface ReportPageProps {
  user: User;
}

type TabType = "income" | "expense" | "loan";

export function ReportPage({ user }: ReportPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("expense");

  const { recurring, confirmations, confirm, unconfirm, isConfirming } = useRecurringTransactions(user.id);
  const { data: categories = [] } = useCategories(user.id, undefined);
  const { data: accounts = [] } = useBankAccounts(user.id);

  // Helper to identify if an item is a loan
  const isLoan = (item: RecurringTransaction) => {
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

      if (activeTab === "income") {
        return item.type === "income";
      } else if (activeTab === "loan") {
        return isLoan(item);
      } else { // expense
        return item.type === "expense" && !isLoan(item);
      }
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
      }
    } else {
      // Confirm (Pay)
      await confirm({
        recurring: {
          ...item,
          occurrence_date: item.next_occurrence_date
        } as PendingRecurring
      });
    }
  };

  const handleEdit = (item: typeof currentMonthItems[0]) => {
    const path = item.type === 'income' ? '/add-income' : '/add-expense';
    navigate(`${path}?edit=${item.id}&recurring=true`);
  };

  const totals = useMemo(() => {
    const total = currentMonthItems.reduce((acc, item) => acc + item.amount, 0);
    const paid = currentMonthItems.filter(i => i.isPaid).reduce((acc, item) => acc + item.amount, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [currentMonthItems]);

  // Group items by Account
  const groupedItems = useMemo(() => {
    const groups: { accountId: string | null; accountName: string; items: typeof currentMonthItems }[] = [];

    // Add known accounts
    accounts.forEach(acc => {
      groups.push({ accountId: acc.id, accountName: acc.name, items: [] });
    });
    // Add General
    groups.push({ accountId: null, accountName: "General", items: [] });

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
          onClick={() => navigate("/add-expense?recurring=true&hint=loan")}
        >
          Nuevo Préstamo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MobileLayout>
      <MobilePageHeader title="Informe visual" showBack rightAction={CreateAction} />

      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Centered Tabs */}
        <div className="px-4 py-4">
          <div className="flex justify-center mb-6">
            <div className="bg-muted p-1 rounded-full flex gap-1 shadow-sm">
              <button
                onClick={() => setActiveTab("income")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  activeTab === "income"
                    ? "bg-white text-black shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Ingresos
              </button>
              <button
                onClick={() => setActiveTab("expense")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  activeTab === "expense"
                    ? "bg-white text-black shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Gastos
              </button>
              <button
                onClick={() => setActiveTab("loan")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  activeTab === "loan"
                    ? "bg-white text-black shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Préstamos
              </button>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
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
          <div className="space-y-6 pb-20 overflow-y-auto">
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-sm font-medium capitalize">{currentMonthName}</h3>
              <span className="text-xs text-muted-foreground">{currentMonthItems.length} elementos</span>
            </div>

            {groupedItems.length > 0 ? (
              groupedItems.map((group) => (
                <div key={group.accountId || 'general'} className="space-y-2">
                  {/* Group Header */}
                  <div className="px-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-1">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.accountName}
                    </h4>
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
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</span>
                            {item.cadence !== 'monthly' && (
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 w-fit">
                                {item.cadence === 'yearly' ? 'Anual' : item.cadence}
                              </Badge>
                            )}
                          </div>
                        </div>

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
        </div>
      </div>
    </MobileLayout>
  );
}
