import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { AssetTransaction } from "@/hooks/useAssetTransactions";

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
    if (!transactions) return { totalInvested: 0, currentValue: 0, pnl: 0, pnlPercent: 0, averagePrice: 0 };

    let totalInvested = 0;
    let currentValue = 0;

    // Calculate net position per symbol
    const positions: Record<string, { quantity: number; costBasis: number }> = {};

    for (const tx of transactions) {
      const symbol = tx.symbol.toUpperCase();
      if (!positions[symbol]) {
        positions[symbol] = { quantity: 0, costBasis: 0 };
      }

      if (tx.side === "buy") {
        positions[symbol].quantity += tx.quantity;
        positions[symbol].costBasis += tx.quantity * tx.price_eur;
      } else {
        // For sells, reduce quantity proportionally
        const avgCost = positions[symbol].quantity > 0
          ? positions[symbol].costBasis / positions[symbol].quantity
          : 0;
        positions[symbol].quantity -= tx.quantity;
        positions[symbol].costBasis -= tx.quantity * avgCost;
      }
    }

    // Calculate totals
    for (const [symbol, pos] of Object.entries(positions)) {
      if (pos.quantity > 0) {
        totalInvested += pos.costBasis;
        const currentPrice = currentPrices[symbol] || 0;
        currentValue += pos.quantity * currentPrice;
      }
    }

    // Calculate average price (for main symbol only)
    let totalQuantityBought = 0;
    let totalCostBasis = 0;
    for (const tx of transactions) {
      if (tx.side === "buy") {
        totalQuantityBought += tx.quantity;
        totalCostBasis += tx.quantity * tx.price_eur;
      }
    }
    const averagePrice = totalQuantityBought > 0 ? totalCostBasis / totalQuantityBought : 0;

    const pnl = currentValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    return { totalInvested, currentValue, pnl, pnlPercent, averagePrice };
  }, [transactions, currentPrices]);

  const formatUSD = (value: number) => formatCurrency(value, "USD");

  const currentPrice = symbol ? currentPrices[symbol.toUpperCase()] : null;

  return (
    <Card className="mx-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-foreground">Resumen DCA</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Valor BTC y Precio promedio en la misma línea */}
        {currentPrice && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              Valor {symbol}: <span className="font-semibold text-foreground">{formatUSD(currentPrice)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Precio promedio: <span className="font-semibold text-foreground">{formatUSD(totals.averagePrice)}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total invertido</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totals.totalInvested, "USDT")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor actual</p>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(totals.currentValue, "USDT")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">PNL</p>
            <p className={cn(
              "text-xl font-bold",
              totals.pnl >= 0 ? "text-chart-income" : "text-destructive"
            )}>
              {totals.pnl >= 0 ? "+" : ""}{formatCurrency(totals.pnl, "USDT")}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">PNL %</p>
            <p className={cn(
              "text-xl font-bold",
              totals.pnlPercent >= 0 ? "text-chart-income" : "text-destructive"
            )}>
              {totals.pnlPercent >= 0 ? "+" : ""}{totals.pnlPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Delete button aligned with refresh */}
        {onDelete && (
          <div className="flex justify-end mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
