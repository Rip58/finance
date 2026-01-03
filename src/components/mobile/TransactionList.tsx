import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: "income" | "expense" | "transfer";
  category?: string;
  date: string;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  title?: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
  className?: string;
  maxItems?: number;
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getCategoryIcon = (type: string) => {
  switch (type) {
    case "income":
      return TrendingUp;
    case "expense":
      return TrendingDown;
    case "transfer":
      return ArrowRightLeft;
    default:
      return TrendingDown;
  }
};

const getCategoryColor = (type: string) => {
  switch (type) {
    case "income":
      return "bg-success/10 text-success";
    case "expense":
      return "bg-destructive/10 text-destructive";
    case "transfer":
      return "bg-chart-assets/10 text-chart-assets";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function TransactionList({
  transactions,
  title = "Transaction History",
  showSeeAll = true,
  onSeeAll,
  className,
  maxItems = 5,
}: TransactionListProps) {
  const displayedTransactions = transactions.slice(0, maxItems);

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {showSeeAll && onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayedTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay transacciones
          </p>
        ) : (
          displayedTransactions.map((tx) => {
            const Icon = getCategoryIcon(tx.type);
            const colorClass = getCategoryColor(tx.type);
            const isPositive = tx.type === "income";

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
              >
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{tx.description || tx.category || "Sin descripción"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.date), "d MMM", { locale: es })}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    isPositive ? "text-success" : "text-foreground"
                  )}
                >
                  {isPositive ? "+" : "-"}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
