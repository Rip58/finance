import { useState } from "react";
import { Trade } from "@/hooks/useTrades";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Filter = "ALL" | "LONG" | "SHORT";

interface TradeHistoryTableProps {
    trades: Trade[];
}

// Small crypto logo — uses CryptoIcons CDN, falls back to a colored text avatar
function CoinLogo({ symbol }: { symbol: string }) {
    const [error, setError] = useState(false);
    // Strip common quote suffixes (USDT, USD, BUSD) to get the base coin slug
    const slug = symbol.toLowerCase()
        .replace(/usdt$/, "")
        .replace(/busd$/, "")
        .replace(/usd$/, "");
    const url = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`;

    if (error) {
        return (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-primary leading-none">
                    {symbol.slice(0, 2)}
                </span>
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={symbol}
            onError={() => setError(true)}
            className="w-5 h-5 rounded-full object-cover shrink-0"
        />
    );
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
    const [filter, setFilter] = useState<Filter>("ALL");
    const filtered = filter === "ALL" ? trades : trades.filter(t => t.direction === filter);

    const pills: { label: string; value: Filter }[] = [
        { label: "Todos", value: "ALL" },
        { label: "Long", value: "LONG" },
        { label: "Short", value: "SHORT" },
    ];

    if (trades.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                No hay historial de operaciones
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl w-fit">
                {pills.map(({ label, value }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === value
                            ? value === "LONG"
                                ? "bg-green-500/20 text-green-500 shadow-sm"
                                : value === "SHORT"
                                    ? "bg-red-500/20 text-red-500 shadow-sm"
                                    : "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {label}
                        {value !== "ALL" && (
                            <span className="ml-1 opacity-60">
                                {trades.filter(t => t.direction === value).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                    No hay operaciones {filter === "LONG" ? "largas" : "cortas"}
                </div>
            ) : (
                <div className="space-y-1.5">
                    {filtered.map((trade) => {
                        const isLong = trade.direction === "LONG";
                        const pnl = trade.exit_price
                            ? (trade.exit_price - trade.entry_price) * trade.quantity * (isLong ? 1 : -1)
                            : 0;
                        const pnlPercent = trade.exit_price
                            ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100 * (isLong ? 1 : -1) * trade.leverage
                            : 0;
                        const isWin = pnl >= 0;

                        return (
                            <div
                                key={trade.id}
                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-card/40 border border-border/40 hover:bg-card/70 transition-colors"
                            >
                                {/* Left: date + logo + symbol + direction badge */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                        {format(new Date(trade.entry_date), "dd/MM")}
                                    </span>
                                    <CoinLogo symbol={trade.symbol} />
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-sm">{trade.symbol}</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[9px] h-4 px-1 py-0 border ${isLong
                                                ? "border-green-500/50 text-green-500"
                                                : "border-red-500/50 text-red-500"
                                                }`}
                                        >
                                            {isLong ? "LONG" : "SHORT"}{trade.leverage > 1 && ` ${trade.leverage}x`}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Center: entry → exit (hidden on mobile) */}
                                <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                                    <span>{trade.entry_price.toLocaleString()}</span>
                                    <span className="opacity-40">→</span>
                                    <span>{trade.exit_price?.toLocaleString() ?? "–"}</span>
                                </div>

                                {/* Right: PnL pill */}
                                <div
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${isWin
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-red-500/10 text-red-500"
                                        }`}
                                >
                                    <span>{pnl > 0 ? "+" : ""}{pnl.toFixed(2)}$</span>
                                    <span className="opacity-60 text-[10px]">
                                        ({pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
