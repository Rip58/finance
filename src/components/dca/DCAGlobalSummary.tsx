import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, PieChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface DCAGlobalSummaryProps {
    totalInvested: number;
    totalCurrentValue: number;
    totalPnL: number;
    totalPnLPercent: number;
}

export function DCAGlobalSummary({
    totalInvested,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
}: DCAGlobalSummaryProps) {
    const isProfitable = totalPnL >= 0;

    return (
        <div className="mx-4 mb-6 grid grid-cols-3 gap-3">
            {/* Total Invested */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Wallet className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Invertido</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                    {formatCurrency(totalInvested, "USD")}
                </p>
            </div>

            {/* PnL */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className={cn(
                    "absolute right-0 top-0 p-1 rounded-bl-lg",
                    isProfitable ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                    {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Activity className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">PnL Global</span>
                </div>
                <div className="flex flex-col">
                    <span className={cn(
                        "text-sm font-bold",
                        isProfitable ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isProfitable ? "+" : ""}{formatCurrency(totalPnL, "USD")}
                    </span>
                    <span className={cn("text-[10px] font-medium opacity-80", isProfitable ? "text-emerald-500" : "text-rose-500")}>
                        {formatPercent(totalPnLPercent)}
                    </span>
                </div>
            </div>

            {/* Current Value */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <PieChart className="h-3.5 w-3.5" />
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Valor Total</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                    {formatCurrency(totalCurrentValue, "USD")}
                </p>
            </div>
        </div>
    );
}
