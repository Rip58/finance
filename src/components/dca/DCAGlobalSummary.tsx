import { formatCurrency, formatPercent } from "@/lib/utils";
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
        <div className="mb-4 grid grid-cols-3 gap-2">
            {/* Invertido */}
            <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-2 text-center">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Invertido</p>
                <p className="font-bold text-[10px] tabular-nums truncate">{formatCurrency(totalInvested, "USD")}</p>
            </div>

            {/* PnL */}
            <div className={cn(
                "rounded-xl py-2 px-2 text-center border",
                isProfitable ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
            )}>
                <p className={cn("text-[8px] uppercase tracking-wide mb-0.5", isProfitable ? "text-emerald-600/80" : "text-rose-600/80")}>PnL Global</p>
                <p className={cn("font-bold text-[10px] tabular-nums truncate", isProfitable ? "text-emerald-600" : "text-rose-600")}>
                    {isProfitable ? "+" : ""}{formatCurrency(totalPnL, "USD")}
                </p>
                <p className={cn("text-[9px] font-medium", isProfitable ? "text-emerald-600/60" : "text-rose-600/60")}>
                    {formatPercent(totalPnLPercent)}
                </p>
            </div>

            {/* Actual */}
            <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-2 text-center">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Actual</p>
                <p className="font-bold text-[10px] tabular-nums truncate">{formatCurrency(totalCurrentValue, "USD")}</p>
            </div>
        </div>
    );
}
