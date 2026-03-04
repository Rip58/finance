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
            <div className="bg-white dark:bg-card rounded-[24px] p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-black mb-3">
                    <Wallet className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium">Invertido</span>
                </div>
                <p className="text-[17px] font-bold text-foreground">
                    {formatCurrency(totalInvested, "USD")}
                </p>
            </div>

            {/* PnL */}
            <div className="bg-white dark:bg-card rounded-[24px] p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center gap-1.5 text-black mb-3">
                    <Activity className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium">PnL Global</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className={cn(
                        "text-[17px] font-bold flex items-center gap-1",
                        isProfitable ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isProfitable ? "+" : ""}{formatCurrency(totalPnL, "USD")}
                        {isProfitable ? <TrendingUp className="h-4 w-4" strokeWidth={2.5} /> : <TrendingDown className="h-4 w-4" strokeWidth={2.5} />}
                    </span>
                    <span className={cn("text-[13px] font-medium", isProfitable ? "text-emerald-500/70" : "text-rose-400/80")}>
                        {formatPercent(totalPnLPercent)}
                    </span>
                </div>
            </div>

            {/* Current Value */}
            <div className="bg-white dark:bg-card rounded-[24px] p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-black mb-3">
                    <PieChart className="h-[18px] w-[18px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium">Actual</span>
                </div>
                <p className="text-[17px] font-bold text-foreground">
                    {formatCurrency(totalCurrentValue, "USD")}
                </p>
            </div>
        </div>
    );
}
