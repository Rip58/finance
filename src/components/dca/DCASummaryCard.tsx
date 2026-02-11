import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, TrendingUp, TrendingDown, Wallet, Target, Zap } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";
import { CryptoLogo } from "./CryptoLogo";

interface DCASummaryCardProps {
  transactions: AssetTransaction[] | undefined;
  currentPrices: Record<string, number>;
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

    let netQuantity = 0;
    let costBasis = 0;

    for (const tx of transactions) {
      if (tx.side === "buy") {
        netQuantity += tx.quantity;
        costBasis += tx.quantity * tx.price_eur;
      } else {
        const avgCost = netQuantity > 0 ? costBasis / netQuantity : 0;
        netQuantity -= tx.quantity;
        costBasis -= tx.quantity * avgCost;
      }
    }

    if (netQuantity < 0) netQuantity = 0;
    if (costBasis < 0) costBasis = 0;

    const upperSymbol = symbol.toUpperCase();
    const currentPrice = currentPrices[upperSymbol] || 0;
    const currentValue = netQuantity * currentPrice;
    const totalInvested = costBasis;
    const averagePrice = netQuantity > 0 ? costBasis / netQuantity : 0;
    const pnl = currentValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return { totalInvested, currentValue, pnl, pnlPercent, averagePrice, netQuantity };
  }, [transactions, currentPrices, symbol]);

  const formatUSD = (value: number) => formatCurrency(value, "USD");
  const currentPrice = symbol ? currentPrices[symbol.toUpperCase()] : null;
  const isProfitable = totals.pnl >= 0;

  return (
    <div className="mx-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">

      {/* Header: Identity & Actions */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <CryptoLogo symbol={symbol} size={48} className="relative z-10 shadow-lg" />
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
          <h2 className="text-4xl font-extrabold tracking-tighter text-foreground drop-shadow-sm">
            {formatCurrency(totals.currentValue, "USDT")}
          </h2>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm",
            isProfitable
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
          )}>
            {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercent(totals.pnlPercent)}
          </div>
          <span className={cn(
            "text-sm font-semibold",
            isProfitable ? "text-emerald-500" : "text-rose-500"
          )}>
            {isProfitable ? "+" : ""}{formatCurrency(totals.pnl, "USDT")}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 py-4 border-t border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Wallet className="h-3 w-3" />
            <span>Invertido</span>
          </div>
          <p className="text-sm font-semibold text-foreground/90">
            {formatCurrency(totals.totalInvested, "USDT")}
          </p>
        </div>

        <div className="space-y-1 border-l border-white/5 pl-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>Avg. Price</span>
          </div>
          <p className="text-sm font-semibold text-foreground/90">
            {formatUSD(totals.averagePrice)}
          </p>
        </div>

        <div className="space-y-1 border-l border-white/5 pl-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>Actual</span>
          </div>
          <p className="text-sm font-semibold text-foreground/90">
            {currentPrice ? formatUSD(currentPrice) : "---"}
          </p>
        </div>
      </div>

    </div>
  );
}
