import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { AddEditTradeDialog } from "@/components/trading/AddEditTradeDialog";
import { ActiveTradeCard } from "@/components/trading/ActiveTradeCard";
import { TradeHistoryTable } from "@/components/trading/TradeHistoryTable";
import { CloseTradeDialog } from "@/components/trading/CloseTradeDialog";
import { User } from "@supabase/supabase-js";

interface TradingPageProps {
    user: User | null;
}

export default function TradingPage({ user }: TradingPageProps) {
    const { trades, isLoading, isError, error, refetch: refetchTrades, updateTrade, deleteTrade } = useTrades(user?.id);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter trades
    const activeTrades = useMemo(() => trades.filter(t => t.status === "OPEN"), [trades]);
    const closedTrades = useMemo(() => trades.filter(t => t.status === "CLOSED"), [trades]);

    // Calculate metrics
    const { wins, losses, winRate, totalWinPnl, totalLossPnl, totalPnl } = useMemo(() => {
        const winTrades = closedTrades.filter(t => (t.exit_price! - t.entry_price) * (t.direction === 'LONG' ? 1 : -1) > 0);
        const lossTrades = closedTrades.filter(t => (t.exit_price! - t.entry_price) * (t.direction === 'LONG' ? 1 : -1) <= 0);
        const calcPnl = (t: Trade) => t.exit_price ? (t.exit_price - t.entry_price) * t.quantity * (t.direction === 'LONG' ? 1 : -1) : 0;
        const twp = winTrades.reduce((acc, t) => acc + calcPnl(t), 0);
        const tlp = lossTrades.reduce((acc, t) => acc + calcPnl(t), 0);
        const w = winTrades.length;
        const l = lossTrades.length;
        const wr = closedTrades.length > 0 ? ((w / closedTrades.length) * 100).toFixed(1) : "0.0";
        return { wins: w, losses: l, winRate: wr, totalWinPnl: twp, totalLossPnl: tlp, totalPnl: twp + tlp };
    }, [closedTrades]);

    // Get symbols for active trades to fetch live prices
    const activeSymbols = [...new Set(activeTrades.map(t => t.symbol))];
    const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(activeSymbols);

    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

    const handleEdit = (trade: Trade) => {
        setSelectedTrade(trade);
        setIsDialogOpen(true);
    };

    const handleClose = (trade: Trade) => {
        setTradeToClose(trade);
        setIsCloseDialogOpen(true);
    };

    const handleCloseConfirm = async (tradeId: string, exitPrice: number, exitDate: Date) => {
        try {
            await updateTrade({
                id: tradeId,
                updates: {
                    status: 'CLOSED',
                    exit_price: exitPrice,
                    exit_date: exitDate.toISOString()
                }
            });
            setIsCloseDialogOpen(false);
            setTradeToClose(null);
        } catch (error) {
            console.error("Error closing trade", error);
        }
    };

    const handleDelete = async (trade: Trade) => {
        if (window.confirm(`¿Estás seguro de eliminar el trade de ${trade.symbol}? Esta acción no se puede deshacer.`)) {
            try {
                await deleteTrade(trade.id);
            } catch (error) {
                console.error("Error deleting trade", error);
            }
        }
    };

    const handleNewTrade = () => {
        setSelectedTrade(null);
        setIsDialogOpen(true);
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchTrades(),
                refreshPrices()
            ]);
        } catch (error) {
            console.error("Error refreshing data:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando diario de trading...</div>;
    }

    if (isError) {
        return (
            <div className="p-8 text-center text-destructive">
                <h3 className="text-lg font-bold">Error al cargar trades</h3>
                <p className="text-sm opacity-80 mb-4">{(error as any)?.message || "Error desconocido"}</p>
                <div className="text-xs text-muted-foreground p-4 bg-muted rounded-md max-w-lg mx-auto overflow-auto">
                    Probablemente la tabla 'trading_journal' no existe. Por favor aplica la migración.
                </div>
            </div>
        );
    }

    return (
        <MobileLayout>
            <div className="container mx-auto p-4 space-y-8 pb-20 fade-in safe-area-pt">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground">
                        Trading Journal
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleNewTrade} size="sm" className="gap-1.5 h-8">
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo Trade
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            className="h-8 w-8"
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* Metrics chips — same style as Report */}
                <div className="grid grid-cols-2 gap-2">
                    {/* PnL Total */}
                    <div className={`rounded-xl py-3 px-3 border ${totalPnl >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <p className={`text-[8px] uppercase tracking-wide mb-0.5 ${totalPnl >= 0 ? 'text-green-600/80' : 'text-red-600/80'}`}>PnL Total</p>
                        <p className={`font-bold text-sm tabular-nums ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} $
                        </p>
                    </div>
                    {/* Win Rate */}
                    <div className="bg-card/50 border border-border/40 rounded-xl py-3 px-3">
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Win Rate</p>
                        <p className="font-bold text-sm">{winRate}%</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {/* Wins */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl py-2 px-2 text-center">
                        <p className="text-[8px] text-green-600/80 uppercase tracking-wide mb-0.5">Wins</p>
                        <p className="font-bold text-sm text-green-600">{wins}</p>
                        <p className="text-[9px] text-green-600/60 tabular-nums">+{totalWinPnl.toFixed(0)} $</p>
                    </div>
                    {/* Losses */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl py-2 px-2 text-center">
                        <p className="text-[8px] text-red-600/80 uppercase tracking-wide mb-0.5">Losses</p>
                        <p className="font-bold text-sm text-red-600">{losses}</p>
                        <p className="text-[9px] text-red-600/60 tabular-nums">{totalLossPnl.toFixed(0)} $</p>
                    </div>
                    {/* Operaciones */}
                    <div className="bg-card/50 border border-border/40 rounded-xl py-2 px-2 text-center">
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wide mb-0.5">Trades</p>
                        <p className="font-bold text-sm">{closedTrades.length}</p>
                        <p className="text-[9px] text-muted-foreground">cerradas</p>
                    </div>
                </div>

                {/* Active Trades */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Operaciones Abiertas
                    </h2>
                    {activeTrades.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
                            No tienes operaciones abiertas
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeTrades.map((trade) => (
                                <ActiveTradeCard
                                    key={trade.id}
                                    trade={trade}
                                    currentPrices={currentPrices}
                                    onEdit={handleEdit}
                                    onClose={handleClose}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* History */}
                <div className="space-y-4 pt-4">
                    <h2 className="text-xl font-semibold">Historial</h2>
                    <TradeHistoryTable trades={closedTrades} />
                </div>

                <AddEditTradeDialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setSelectedTrade(null);
                    }}
                    userId={user?.id}
                    tradeToEdit={selectedTrade}
                />

                <CloseTradeDialog
                    open={isCloseDialogOpen}
                    onOpenChange={(open) => {
                        setIsCloseDialogOpen(open);
                        if (!open) setTradeToClose(null);
                    }}
                    trade={tradeToClose}
                    currentPrice={tradeToClose ? (
                        typeof currentPrices[tradeToClose.symbol] === 'number'
                            ? currentPrices[tradeToClose.symbol]
                            : currentPrices[tradeToClose.symbol]?.price
                    ) : undefined}
                    onConfirm={handleCloseConfirm}
                />
            </div>
        </MobileLayout>
    );
}
