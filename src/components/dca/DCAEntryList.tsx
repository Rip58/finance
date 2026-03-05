import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";
import { CryptoLogo } from "./CryptoLogo";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  name: string;
}

type FilterType = "all" | "buy" | "sell";

interface DCAEntryListProps {
  transactions: AssetTransaction[] | undefined;
  bankAccounts?: BankAccount[];
  onEdit: (tx: AssetTransaction) => void;
  onDelete: (id: string) => void;
}

export function DCAEntryList({ transactions, bankAccounts = [], onEdit, onDelete }: DCAEntryListProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const allEntries = (transactions || [])
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  const filteredEntries = filter === "all" ? allEntries : allEntries.filter((tx) => tx.side === filter);
  const buyCount = allEntries.filter((tx) => tx.side === "buy").length;
  const sellCount = allEntries.filter((tx) => tx.side === "sell").length;

  if (allEntries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl mx-4">
        <p>No hay entradas de DCA todavía.</p>
        <p className="text-xs mt-1">Pulsa el botón + para añadir tu primera compra.</p>
      </div>
    );
  }

  const getAccountName = (id: string | null) => {
    if (!id) return null;
    return bankAccounts.find((acc) => acc.id === id)?.name;
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: allEntries.length },
    { key: "buy", label: "Compras", count: buyCount },
    { key: "sell", label: "Ventas", count: sellCount },
  ];

  return (
    <div className="space-y-3 px-4">
      {/* Filter pills */}
      <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-medium transition-all",
              filter === f.key
                ? f.key === "sell"
                  ? "bg-rose-500/20 text-rose-500 shadow-sm"
                  : f.key === "buy"
                    ? "bg-emerald-500/20 text-emerald-600 shadow-sm"
                    : "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label} <span className="opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {filteredEntries.map((tx) => {
          const accountName = getAccountName((tx as any).bank_account_id);
          const isSell = tx.side === "sell";
          const total = tx.quantity * tx.price_eur;

          return (
            <div
              key={tx.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition-colors",
                isSell && "bg-rose-500/5 border-rose-500/20"
              )}
            >
              {/* Left: icon + date + qty */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <CryptoLogo symbol={tx.symbol} size={28} />
                  {isSell ? (
                    <ArrowUpCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-rose-500 bg-background rounded-full" />
                  ) : (
                    <ArrowDownCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-emerald-500 bg-background rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    {format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {tx.quantity} × {formatCurrency(tx.price_eur, "USD")}
                  </p>
                  {accountName && (
                    <div className="flex items-center gap-1 text-[10px] text-primary/70 mt-0.5">
                      <Wallet className="h-2.5 w-2.5" />
                      <span>{accountName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: total + actions */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className={cn(
                  "font-bold text-sm mr-1",
                  isSell ? "text-rose-500" : "text-foreground"
                )}>
                  {isSell ? "" : "+"}{formatCurrency(total, "USD")}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(tx)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10" onClick={() => onDelete(tx.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
