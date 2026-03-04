import type { AssetTransaction } from "@/hooks/useAssetTransactions";

export interface DCAStats {
    netQuantity: number;
    costBasis: number;
    averagePrice: number;
    realizedPnL: number;
    totalInvestedAllTime: number;
}

export function calculateDCAStats(transactions: AssetTransaction[]): DCAStats {
    if (!transactions || transactions.length === 0) {
        return { netQuantity: 0, costBasis: 0, averagePrice: 0, realizedPnL: 0, totalInvestedAllTime: 0 };
    }

    // Ensure chronological order for proper average cost basis tracking
    const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let netQuantity = 0;
    let costBasis = 0;
    let realizedPnL = 0;
    let totalInvestedAllTime = 0;

    for (const tx of sortedTxs) {
        if (tx.side === "buy") {
            netQuantity += tx.quantity;
            costBasis += tx.quantity * tx.price_eur;
            totalInvestedAllTime += tx.quantity * tx.price_eur;
        } else if (tx.side === "sell") {
            const avgCost = netQuantity > 0 ? costBasis / netQuantity : 0;
            const costOfSold = tx.quantity * avgCost;
            const saleValue = tx.quantity * tx.price_eur;

            realizedPnL += (saleValue - costOfSold);

            netQuantity -= tx.quantity;
            costBasis -= costOfSold;
        }
    }

    // Handle tiny floating point issues (e.g. 1e-10) after full sell
    if (netQuantity <= 1e-8) {
        netQuantity = 0;
        costBasis = 0;
    }

    const averagePrice = netQuantity > 0 ? costBasis / netQuantity : 0;

    return { netQuantity, costBasis, averagePrice, realizedPnL, totalInvestedAllTime };
}
