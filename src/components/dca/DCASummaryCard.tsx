import { useMemo } from "react";
import { calculateDCAStats } from "@/lib/dcaUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, TrendingUp, TrendingDown, Wallet, Target, Zap } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
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

    // Total invested refers to current holdings cost basis!
    const totalInvested = costBasis;

    const unrealizedPnL = currentValue - totalInvested;
    const pnl = realizedPnL + unrealizedPnL;

    // PNL percent is historical yield against all invested capital
    const pnlPercent = totalInvestedAllTime > 0 ? (pnl / totalInvestedAllTime) * 100 : 0;

    return { totalInvested, currentValue, pnl, pnlPercent, averagePrice, netQuantity };
  }, [transactions, currentPrices, symbol]);

  const formatFiat = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value).replace("US$", "$");
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const priceData = symbol ? currentPrices[symbol.toUpperCase()] : null;
  const currentPrice = typeof priceData === 'number' ? priceData : ((priceData as any)?.price || 0);
  const isProfitable = totals.pnl >= 0;

  return (
    <div className="mx-4 relative overflow-hidden rounded-[32px] bg-white dark:bg-card p-6 shadow-sm">

      {/* Header: Identity & Actions */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CryptoLogo symbol={symbol} size={48} className="relative z-10" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none tracking-tight text-foreground">{symbol.toUpperCase()}</h3>
            <p className="text-xs text-muted-foreground mt-1 font-mono tracking-wide">
              {totals.netQuantity > 0
                ? `${totals.netQuantity.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} ${symbol.toUpperCase()}`
                : `0 ${symbol.toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 bg-muted/30 dark:bg-muted/10 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors border border-border/20"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-9 w-9 bg-muted/30 dark:bg-muted/10 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section: Value & Performance */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground font-medium mb-1">Valor Actual</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-[40px] font-extrabold tracking-tight text-foreground leading-none">
            {formatCurrency(totals.currentValue, "USD")}
          </h2>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className={cn(
            "px-2.5 py-1 rounded-3xl text-xs font-bold flex items-center gap-1 shadow-sm",
            isProfitable
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20"
              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20"
          )}>
            {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isProfitable ? "+" : ""}{totals.pnlPercent.toFixed(1)}%
          </div>
          <span className={cn(
            "text-base font-bold",
            isProfitable ? "text-emerald-500" : "text-rose-500"
          )}>
            {isProfitable ? "+" : ""}{formatCurrency(totals.pnl, "USD")}
          </span>
        </div>
      </div>

      <div className="flex flex-row justify-between pt-3 border-t border-border/40">
        <div className="space-y-1 flex-1 pr-2">
          <div className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground/80 font-medium">
            <Wallet className="h-4 w-4 stroke-[2.5]" />
            <span>Invertido</span>
          </div>
          <p className="text-[15px] font-bold text-foreground">
            {formatCurrency(totals.totalInvested, "USD")}
          </p>
        </div>

        <div className="space-y-1 border-l border-border/40 px-4 flex-1">
          <div className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground/80 font-medium">
            <Target className="h-4 w-4 stroke-[2.5]" />
            <span>Medio</span>
          </div>
          <p className="text-[15px] font-bold text-foreground">
            {formatCurrency(totals.averagePrice, "USD")}
          </p>
        </div>

        <div className="space-y-1 border-l border-border/40 pl-4 flex-1">
          <div className="flex items-center gap-1 text-xs tracking-wide text-muted-foreground/80 font-medium">
            <Zap className="h-4 w-4 stroke-[2.5]" />
            <span>Actual</span>
          </div>
          <p className="text-[15px] font-bold text-foreground">
            {currentPrice ? formatCurrency(currentPrice, "USD") : "---"}
          </p>
        </div>
      </div>

    </div>
  );
}
