import { useMemo } from "react";
import { calculateDCAStats } from "@/lib/dcaUtils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Pencil } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";
import { CryptoLogo } from "./CryptoLogo";

interface DCASummaryCardProps {
  transactions: AssetTransaction[] | undefined;
  currentPrices: Record<string, number | any>;
  symbol: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onDelete?: () => void;
  onUpdateQuantity?: (newQuantity: number) => void;
}

export function DCASummaryCard({
  transactions,
  currentPrices,
  symbol,
  onRefresh,
  isRefreshing,
  onDelete,
  onUpdateQuantity
}: DCASummaryCardProps) {
  const totals = useMemo(() => {
    if (!transactions || transactions.length === 0)
      return { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0, averagePrice: 0, netQuantity: 0 };

    const { netQuantity, costBasis, averagePrice, realizedPnL, totalInvestedAllTime } = calculateDCAStats(transactions);

    const upperSymbol = symbol.toUpperCase();
    const priceData = currentPrices[upperSymbol];
    const currentPrice = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
    const currentValue = netQuantity * currentPrice;
    const totalInvested = costBasis;
    const unrealizedPnL = currentValue - totalInvested;
    const pnl = realizedPnL + unrealizedPnL;
    const pnlPercent = totalInvestedAllTime > 0 ? (pnl / totalInvestedAllTime) * 100 : 0;

    return { totalInvested, currentValue, pnl, pnlPercent, averagePrice, netQuantity };
  }, [transactions, currentPrices, symbol]);

  const priceData = symbol ? currentPrices[symbol.toUpperCase()] : null;
  const currentPrice = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
  const isProfitable = totals.pnl >= 0;

  return (
    <div className="mx-4 rounded-2xl border border-border/40 bg-card/50 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <CryptoLogo symbol={symbol} size={36} />
          <div>
            <h3 className="font-bold text-base leading-tight">{symbol.toUpperCase()}</h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              {totals.netQuantity > 0
                ? `${totals.netQuantity.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} ${symbol.toUpperCase()}`
                : `0 ${symbol.toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 text-muted-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </Button>
          {onUpdateQuantity && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdateQuantity(totals.netQuantity)}
              className="h-8 w-8 text-muted-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Hero: Valor Actual (left) | Invertido (right) */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Valor Actual</p>
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(totals.currentValue, "USD")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Invertido</p>
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(totals.totalInvested, "USD")}
          </span>
        </div>
      </div>

      {/* 3-col footer — same style as Report chips */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
        {/* Precio Medio */}
        <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-2 text-center">
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Precio Medio</p>
          <p className="font-bold text-[10px] tabular-nums truncate">{totals.averagePrice > 0 ? formatCurrency(totals.averagePrice, "USD") : "—"}</p>
        </div>

        {/* PnL — colored */}
        <div className={cn(
          "rounded-xl py-2 px-2 text-center border",
          isProfitable ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
        )}>
          <p className={cn("text-[8px] uppercase tracking-wide mb-0.5", isProfitable ? "text-emerald-600/80" : "text-rose-600/80")}>PnL</p>
          <p className={cn("font-bold text-[10px] tabular-nums truncate", isProfitable ? "text-emerald-600" : "text-rose-600")}>
            {isProfitable ? "+" : ""}{formatCurrency(totals.pnl, "USD")}
          </p>
          <p className={cn("text-[9px] font-medium", isProfitable ? "text-emerald-600/60" : "text-rose-600/60")}>
            {isProfitable ? "+" : ""}{totals.pnlPercent.toFixed(1)}%
          </p>
        </div>

        {/* Actual */}
        <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-2 text-center">
          <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Actual</p>
          <p className="font-bold text-[10px] tabular-nums truncate">{currentPrice ? formatCurrency(currentPrice, "USD") : "—"}</p>
        </div>
      </div>
    </div>
  );
}
