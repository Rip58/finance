import { Trade } from "@/hooks/useTrades";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { TradeProgressBar } from "./TradeProgressBar";
import { differenceInDays } from "date-fns";

interface ActiveTradeCardProps {
    trade: Trade;
    currentPrices: Record<string, any>;
    onEdit?: (trade: Trade) => void;
    onClose?: (trade: Trade) => void;
    onDelete?: (trade: Trade) => void;
}

export function ActiveTradeCard({ trade, currentPrices, onEdit, onClose, onDelete }: ActiveTradeCardProps) {
    const currentPriceData = currentPrices[trade.symbol];
    const currentPrice = typeof currentPriceData === 'number'
        ? currentPriceData
        : (typeof currentPriceData === 'object' ? currentPriceData.price : trade.entry_price);

    const isLong = trade.direction === "LONG";

    // PnL
    const pnl = (currentPrice - trade.entry_price) * trade.quantity * (isLong ? 1 : -1);
    const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100 * (isLong ? 1 : -1) * trade.leverage;

    // Days open
    const daysOpen = differenceInDays(new Date(), new Date(trade.entry_date));

    // R:R ratio — uses first TP and SL
    const sl = trade.stop_loss;
    const tp1 = trade.take_profit_1;
    const rrRatio = (() => {
        if (!sl || !tp1) return null;
        const risk = Math.abs(trade.entry_price - sl);
        const reward = Math.abs(tp1 - trade.entry_price);
        if (risk === 0) return null;
        return (reward / risk).toFixed(1);
    })();

    // Format Price Helper
    const formatPrice = (price: number | undefined | null) => {
        if (price === undefined || price === null) return "-";
        if (trade.symbol.includes("BTC") || price >= 1000) {
            return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        return price.toLocaleString('en-US');
    };

    // Next TP distance
    const tps = [trade.take_profit_1, trade.take_profit_2, trade.take_profit_3].filter(Boolean) as number[];
    const sortedTps = tps.sort((a, b) => isLong ? a - b : b - a);
    const nextTp = sortedTps.find(tp => isLong ? tp > currentPrice : tp < currentPrice);
    const distToNextTp = nextTp ? Math.abs((nextTp - currentPrice) / currentPrice * 100) : null;

    return (
        <div className={`relative rounded-2xl border overflow-hidden ${pnl >= 0 ? "border-green-500/20 bg-green-500/[0.03]" : "border-red-500/20 bg-red-500/[0.03]"
            }`}>
            {/* Header row */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{trade.symbol}</span>
                    <Badge
                        variant={isLong ? "default" : "destructive"}
                        className="text-[9px] h-4 px-1.5"
                    >
                        {isLong ? "LONG" : "SHORT"}{trade.leverage > 1 && ` ${trade.leverage}x`}
                    </Badge>
                </div>

                {/* Meta pills */}
                <div className="flex items-center gap-2">
                    {rrRatio && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            R:R {rrRatio}
                        </span>
                    )}
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {daysOpen}d
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(trade)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onClose?.(trade)}>Cerrar Trade</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete?.(trade)} className="text-destructive focus:text-destructive">Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Price row */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-1 items-end">
                <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Entrada</span>
                    <div className="font-mono text-sm">{formatPrice(trade.entry_price)} $</div>
                </div>

                <div className="text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Precio</span>
                    <div className="font-mono font-bold text-base">{formatPrice(currentPrice)} $</div>
                </div>

                <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">PnL</span>
                    <div className={`font-mono font-bold text-sm ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} $
                    </div>
                    <div className={`text-xs font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </div>
                    {distToNextTp !== null && (
                        <div className="text-[10px] text-muted-foreground">
                            {distToNextTp.toFixed(1)}% → TP
                        </div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-4">
                <TradeProgressBar
                    trade={trade}
                    currentPrice={currentPrice}
                    isLong={isLong}
                    formatPrice={formatPrice}
                />
            </div>
        </div>
    );
}
