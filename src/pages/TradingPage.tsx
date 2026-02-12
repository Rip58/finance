import { useState } from "react";
import { useTrades, Trade } from "@/hooks/useTrades";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { AddEditTradeDialog } from "@/components/trading/AddEditTradeDialog";
import { ActiveTradeCard } from "@/components/trading/ActiveTradeCard";
import { TradeHistoryTable } from "@/components/trading/TradeHistoryTable";
import { User } from "@supabase/supabase-js";

interface TradingPageProps {
    user: User | null;
}

export default function TradingPage({ user }: TradingPageProps) {
    const { trades, isLoading, isError, error, refetch: refetchTrades } = useTrades(user?.id);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter trades
    const activeTrades = trades.filter(t => t.status === "OPEN");
    const closedTrades = trades.filter(t => t.status === "CLOSED");

    // Get symbols for active trades to fetch live prices
    const activeSymbols = [...new Set(activeTrades.map(t => t.symbol))];
    const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(activeSymbols);

    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

    const handleEdit = (trade: Trade) => {
        setSelectedTrade(trade);
        setIsDialogOpen(true);
    };

    const handleClose = (trade: Trade) => {
        // Optimistically update status for the dialog, actual update happens in onSave
        setSelectedTrade({ ...trade, status: 'CLOSED' });
        setIsDialogOpen(true);
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
        <div className="container mx-auto p-4 space-y-8 pb-20 fade-in">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Trading Journal
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Gestiona tus operaciones y analiza tu rendimiento
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={handleNewTrade} size="sm" className="gap-2 h-8">
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo Trade
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        className="gap-2 h-8"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Metrics Section (Placeholder for now) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card/50 backdrop-blur border border-border/50 p-4 rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</span>
                    <div className="text-2xl font-bold mt-1">
                        {closedTrades.length > 0
                            ? `${((closedTrades.filter(t => (t.exit_price! - t.entry_price) * (t.direction === 'LONG' ? 1 : -1) > 0).length / closedTrades.length) * 100).toFixed(1)}%`
                            : "0.0%"}
                    </div>
                </div>
                <div className="bg-card/50 backdrop-blur border border-border/50 p-4 rounded-xl">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Trades Activos</span>
                    <div className="text-2xl font-bold mt-1 text-primary">{activeTrades.length}</div>
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
        </div >
    );
}
