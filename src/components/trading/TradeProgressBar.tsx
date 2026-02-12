import { useMemo } from "react";
import { Trade } from "@/hooks/useTrades";

interface TradeProgressBarProps {
    trade: Trade;
    currentPrice: number | undefined;
    isLong: boolean;
    formatPrice: (price: number | undefined | null) => string;
}

export function TradeProgressBar({ trade, currentPrice, isLong, formatPrice }: TradeProgressBarProps) {
    // Memoize calculations to prevent unnecessary re-renders
    const progressBarData = useMemo(() => {
        const tps = [trade.take_profit_1, trade.take_profit_2, trade.take_profit_3].filter(Boolean) as number[];
        const sl = trade.stop_loss || trade.entry_price * (isLong ? 0.9 : 1.1);
        const maxTp = tps.length > 0 ? (isLong ? Math.max(...tps) : Math.min(...tps)) : trade.entry_price * (isLong ? 1.1 : 0.9);
        const price = currentPrice || trade.entry_price;

        // For visualization, we need absolute Min and Max of the graph
        const graphMin = Math.min(sl, maxTp, trade.entry_price, price);
        const graphMax = Math.max(sl, maxTp, trade.entry_price, price);
        const totalRange = graphMax - graphMin;

        // Helper for % position
        const getPos = (val: number) => {
            if (totalRange === 0) return 50;
            return ((val - graphMin) / totalRange) * 100;
        }

        const entryPos = getPos(trade.entry_price);
        const slPos = getPos(sl);
        const currentPos = getPos(price);

        return { tps, sl, entryPos, slPos, currentPos, getPos, maxTp };
    }, [trade, currentPrice, isLong]);

    const { tps, sl, entryPos, slPos, currentPos, getPos, maxTp } = progressBarData;
    const pnl = currentPrice ? (currentPrice - trade.entry_price) * (isLong ? 1 : -1) : 0;

    return (
        <div className="pt-8 pb-2 space-y-2">
            <div className="relative h-4 w-full bg-secondary/30 rounded-sm overflow-visible border border-border/30">
                {/* Risk Zone (Red) - From SL to Entry */}
                <div
                    className="absolute top-0 bottom-0 bg-red-500/20 border-r border-red-500/30"
                    style={{
                        left: `${Math.min(slPos, entryPos)}%`,
                        width: `${Math.abs(entryPos - slPos)}%`
                    }}
                />

                {/* Reward Zone (Green) - From Entry to Max TP */}
                <div
                    className="absolute top-0 bottom-0 bg-green-500/20 border-r border-green-500/30"
                    style={{
                        left: `${Math.min(entryPos, getPos(maxTp))}%`,
                        width: `${Math.abs(getPos(maxTp) - entryPos)}%`
                    }}
                />

                {/* Entry Marker (Blue Line) & Label */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                    style={{ left: `${entryPos}%` }}
                />
                <div
                    className="absolute bottom-full mb-1 transform -translate-x-1/2 text-[10px] font-mono whitespace-nowrap text-blue-500 font-bold"
                    style={{ left: `${entryPos}%` }}
                >
                    {formatPrice(trade.entry_price)}
                </div>

                {/* Current Price Marker (Diamond/Line with glow) */}
                <div
                    className={`absolute top-0 bottom-0 w-1 z-30 shadow-[0_0_10px_rgba(0,0,0,0.8)] ${pnl >= 0 ? "bg-green-400 shadow-green-400/50" : "bg-red-500 shadow-red-500/50"}`}
                    style={{ left: `${currentPos}%` }}
                    title={`Current: ${formatPrice(currentPrice)}`}
                />

                {/* TP Markers & Labels */}
                {tps.map((tp, i) => (
                    <div key={i}>
                        <div
                            className="absolute top-0 bottom-0 w-px bg-green-500/60 z-20 border-dashed border-l border-green-500"
                            style={{ left: `${getPos(tp)}%` }}
                        />
                        <div
                            className="absolute bottom-full mb-1 transform -translate-x-1/2 text-[10px] font-mono whitespace-nowrap text-green-500"
                            style={{ left: `${getPos(tp)}%` }}
                        >
                            {formatPrice(tp)}
                        </div>
                    </div>
                ))}

                {/* SL Marker & Label (Optional, good for context) */}
                <div
                    className="absolute bottom-full mb-1 transform -translate-x-1/2 text-[10px] font-mono whitespace-nowrap text-red-500 opacity-70"
                    style={{ left: `${slPos}%` }}
                >
                    {formatPrice(sl)}
                </div>
            </div>
        </div>
    );
}
