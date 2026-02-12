import { Trade } from "@/hooks/useTrades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ActiveTradeCardProps {
    trade: Trade;
    currentPrices: Record<string, any>; // Keeping any here as it comes from API response usually
    onEdit?: (trade: Trade) => void;
    onClose?: (trade: Trade) => void;
}

export function ActiveTradeCard({ trade, currentPrices, onEdit, onClose }: ActiveTradeCardProps) {
    const currentPriceData = currentPrices[trade.symbol];
    const currentPrice = typeof currentPriceData === 'number'
        ? currentPriceData
        : (typeof currentPriceData === 'object' ? currentPriceData.price : trade.entry_price);

    const isLong = trade.direction === "LONG";

    // Calculate PnL
    const pnl = (currentPrice - trade.entry_price) * trade.quantity * (isLong ? 1 : -1);
    const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100 * (isLong ? 1 : -1) * trade.leverage;

    // Format Price Helper
    const formatPrice = (price: number | undefined | null) => {
        if (price === undefined || price === null) return "-";
        // BTC specific or large numbers: no decimals
        if (trade.symbol.includes("BTC") || price >= 1000) {
            return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        // Others: keep decimals
        return price.toLocaleString('en-US');
    };

    // Calculate Next TP distance
    const tps = [trade.take_profit_1, trade.take_profit_2, trade.take_profit_3].filter(Boolean) as number[];
    const sortedTps = tps.sort((a, b) => isLong ? a - b : b - a);
    const nextTp = sortedTps.find(tp => isLong ? tp > currentPrice : tp < currentPrice);
    const distToNextTp = nextTp ? Math.abs((nextTp - currentPrice) / currentPrice * 100) : null;

    return (
        <Card className="relative overflow-hidden border-border/50 bg-card/40 backdrop-blur-md">
            {/* Background Gradient based on PnL */}
            <div
                className={`absolute inset-0 opacity-[0.03] pointer-events-none ${pnl >= 0 ? "bg-gradient-to-br from-green-500 to-transparent" : "bg-gradient-to-br from-red-500 to-transparent"
                    }`}
            />

            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        {trade.symbol}
                        <Badge variant={isLong ? "default" : "destructive"} className="text-[10px] h-5 px-1.5">
                            {trade.direction === 'LONG' ? 'LONG' : 'SHORT'} {trade.leverage > 1 && `${trade.leverage}x`}
                        </Badge>
                    </CardTitle>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(trade)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClose?.(trade)} className="text-destructive">Cerrar Trade</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>

            <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4 items-end">
                    {/* Column 1: Entry */}
                    <div className="text-left">
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Entrada</span>
                        <div className="font-mono font-medium text-base">
                            {formatPrice(trade.entry_price)} $
                        </div>
                    </div>

                    {/* Column 2: Current Price */}
                    <div className="text-center">
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Precio</span>
                        <div className="font-mono font-bold text-lg">
                            {formatPrice(currentPrice)} $
                        </div>
                    </div>

                    {/* Column 3: PnL */}
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">PnL</span>
                        <div className={`font-mono font-bold text-base ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} $
                        </div>
                        <div className={`text-xs font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                        </div>
                        {/* Next TP Distance */}
                        {distToNextTp !== null && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                A {distToNextTp.toFixed(2)}% del TP
                            </div>
                        )}
                    </div>
                </div>

                {/* Unified Trade Progress Bar */}
                <TradeProgressBar
                    trade={trade}
                    currentPrice={currentPrice}
                    isLong={isLong}
                    formatPrice={formatPrice}
                />
            </CardContent>
        </Card>
    );
}
