import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
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

  const filteredEntries = filter === "all"
    ? allEntries
    : allEntries.filter((tx) => tx.side === filter);

  const buyCount = allEntries.filter((tx) => tx.side === "buy").length;
  const sellCount = allEntries.filter((tx) => tx.side === "sell").length;

  if (allEntries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground">
        <p>No hay entradas de DCA todavía.</p>
        <p className="text-sm">Pulsa el botón + para añadir tu primera compra.</p>
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
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
              filter === f.key
                ? f.key === "sell"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filteredEntries.map((tx) => {
        const accountName = getAccountName((tx as any).bank_account_id);
        const isSell = tx.side === "sell";
        const total = tx.quantity * tx.price_eur;

        return (
          <Card
            key={tx.id}
            className={cn(
              "p-3",
              isSell && "border-destructive/30 bg-destructive/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <CryptoLogo symbol={tx.symbol} size={36} />
                  {isSell ? (
                    <ArrowUpCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-destructive bg-background rounded-full" />
                  ) : (
                    <ArrowDownCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-chart-income bg-background rounded-full" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.quantity} × {formatCurrency(tx.price_eur, "USDT")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <p className={cn(
                  "font-bold text-sm mr-1",
                  isSell ? "text-destructive" : "text-foreground"
                )}>
                  {isSell ? "-" : "+"}{formatCurrency(total, "USDT")}
                </p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tx)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(tx.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {(tx.notes || accountName) && (
              <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2 flex flex-col gap-1">
                {accountName && (
                  <div className="flex items-center gap-1.5 text-primary/80">
                    <Wallet className="h-3 w-3" />
                    <span>{accountName}</span>
                  </div>
                )}
                {tx.notes && (
                  <p>{tx.notes}</p>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
