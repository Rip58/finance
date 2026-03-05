import { useMemo } from "react";
import { calculateDCAStats } from "@/lib/dcaUtils";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, TrendingUp, TrendingDown, Wallet, Target, Zap } from "lucide-react";
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
}

export function DCASummaryCard({
  transactions,
  currentPrices,
  symbol,
  onRefresh,
  isRefreshing,
  onDelete
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

      {/* Hero: value + PnL */}
      <div className="mb-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Valor Actual</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(totals.currentValue, "USD")}
          </span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
            isProfitable
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-rose-500/10 text-rose-500"
          )}>
            {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isProfitable ? "+" : ""}{totals.pnlPercent.toFixed(1)}%
          </div>
          <span className={cn(
            "text-sm font-bold",
            isProfitable ? "text-emerald-500" : "text-rose-500"
          )}>
            {isProfitable ? "+" : ""}{formatCurrency(totals.pnl, "USD")}
          </span>
        </div>
      </div>

      {/* 3-col footer */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            <Wallet className="h-3 w-3" />
            Invertido
          </div>
          <p className="text-sm font-bold">{formatCurrency(totals.totalInvested, "USD")}</p>
        </div>
        <div className="border-l border-border/30 pl-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            <Target className="h-3 w-3" />
            Medio
          </div>
          <p className="text-sm font-bold">{formatCurrency(totals.averagePrice, "USD")}</p>
        </div>
        <div className="border-l border-border/30 pl-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            <Zap className="h-3 w-3" />
            Actual
          </div>
          <p className="text-sm font-bold">{currentPrice ? formatCurrency(currentPrice, "USD") : "—"}</p>
        </div>
      </div>
    </div>
  );
}
