import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check } from "lucide-react";
import {
  MobileLayout,
  MobilePageHeader,
} from "@/components/mobile";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { useRecurringTransactions, type RecurringTransaction, type PendingRecurring } from "@/hooks/useRecurringTransactions";
import { useCategories } from "@/hooks/useCategories";
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

  const { recurring, confirmations, confirm, isConfirming } = useRecurringTransactions(user.id);
  const { data: categories = [] } = useCategories(user.id, undefined);

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
      // Check if it is confirmed for this month
      // We look for a confirmation that has an occurrence_date strictly within the current month
      // OR specifically matches the transaction date logic. 
      // Simplified: Check if any confirmation exists for this item in the current month.
      const confirmation = confirmations.find(c =>
        c.recurring_id === item.id &&
        isSameMonth(parseISO(c.occurrence_date), today)
      );

      // Check if it is due this month (or overdue)
      const nextDate = parseISO(item.next_occurrence_date);
      // It is due if next date is on or before end of this month
      const isDue = nextDate <= currentMonthEnd;
      const isPaid = !!confirmation;

      // Logic to decide if we show it:
      // 1. If it's already paid this month -> Show (Active & Done)
      // 2. If it's NOT paid but Due this month -> Show (Pending)
      // 3. If it's monthly cadence -> Always Show (even if next date is next month? No, if next date is next month and NOT paid this month, it means we missed it? Or we already paid it?)
      // If we already paid it, logic #1 covers it.
      // If we haven't paid it, `nextDate` should be pending.
      // 4. Overdue items? (nextDate < startOfMonth). Yes, show as pending.

      const relevant = isPaid || isDue;

      return {
        ...item,
        isPaid,
        confirmationId: confirmation?.id,
        isRelevant: relevant
      };
    }).filter(i => i.isRelevant);
  }, [filteredItems, confirmations]);

  const handleCheck = async (item: typeof currentMonthItems[0]) => {
    if (item.isPaid) return;

    await confirm({
      recurring: {
        ...item,
        occurrence_date: item.next_occurrence_date
      } as PendingRecurring
    });
  };

  const totals = useMemo(() => {
    const total = currentMonthItems.reduce((acc, item) => acc + item.amount, 0);
    const paid = currentMonthItems.filter(i => i.isPaid).reduce((acc, item) => acc + item.amount, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [currentMonthItems]);

  const currentMonthName = format(new Date(), "MMMM", { locale: es });

  return (
    <MobileLayout>
      <MobilePageHeader title="Informe visual" showBack />

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
          <div className="space-y-3 pb-20">
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-sm font-medium capitalize">{currentMonthName}</h3>
              <span className="text-xs text-muted-foreground">{currentMonthItems.length} elementos</span>
            </div>

            {currentMonthItems.length > 0 ? (
              currentMonthItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-3xl border transition-all duration-200",
                    item.isPaid
                      ? "bg-muted/30 border-transparent opacity-60"
                      : "bg-card border-border shadow-sm"
                  )}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className={cn("font-medium truncate", item.isPaid && "line-through text-muted-foreground")}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatCurrency(item.amount)}</span>
                      {item.cadence !== 'monthly' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">
                          {item.cadence}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant={item.isPaid ? "ghost" : "default"}
                    className={cn(
                      "h-10 w-10 rounded-full shrink-0 transition-all",
                      item.isPaid
                        ? "text-muted-foreground bg-muted hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:scale-105 shadow-glow-primary"
                    )}
                    onClick={() => handleCheck(item)}
                    disabled={item.isPaid || isConfirming}
                  >
                    {item.isPaid ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-current" />
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
                <p className="text-muted-foreground text-sm">No hay elementos configurados para este mes</p>
              </div>
            )}
          </div>
        </div>

        {/* FAB for Adding */}
        <div className="fixed bottom-6 right-6">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              if (activeTab === "income") navigate("/add-income?recurring=true");
              else navigate("/add-expense?recurring=true");
            }}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
