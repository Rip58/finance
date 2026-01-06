import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { useCryptoMarketData } from "@/hooks/useCryptoMarketData"; // New hook
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";

interface CryptoPageProps {
    user: User;
}

// Helper to format crypto prices with appropriate precision
const formatCryptoPrice = (price: number): string => {
    if (!price || price === 0) return "—";

    // For very small numbers (less than 1), show 4 significant digits
    if (price < 1) {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "USD",
            minimumSignificantDigits: 4,
            maximumSignificantDigits: 4,
        }).format(price);
    }

    // For regular numbers, standard 2 decimal places
    return formatCurrency(price, "USD");
};

// Helper to format volume compactly
const formatVolume = (volume: number | null): string => {
    if (!volume) return "Vol: —";
    if (volume >= 1e9) return `Vol: ${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `Vol: ${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `Vol: ${(volume / 1e3).toFixed(1)}K`;
    return `Vol: ${volume.toFixed(0)}`;
};

type Timeframe = "24h" | "7d" | "30d";

export function CryptoPage({ user }: CryptoPageProps) {
    const { toast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState<Timeframe>("24h");

    const { data: cryptoAssets = [] } = useCryptoAssets(user.id);

    // Get symbols from crypto_assets
    const symbols = useMemo(() => {
        return cryptoAssets.map(asset => asset.symbol.toUpperCase());
    }, [cryptoAssets]);

    // Use the new hook for rich market data
    const { data: marketData = {}, refreshMarketData } = useCryptoMarketData(symbols);

    // Aggregate assets with real market data
    const aggregatedAssets = useMemo(() => {
        return cryptoAssets.map(asset => {
            const symbol = asset.symbol.toUpperCase();
            const data = marketData[symbol];

            return {
                symbol: asset.symbol,
                name: asset.name,
                currentPrice: data?.price || 0,
                rank: data?.rank || 999999, // Default to end if no rank
                volume24h: data?.volume24h || null,
                variations: {
                    "24h": data?.change24h || 0,
                    "7d": data?.change7d || 0,
                    "30d": data?.change30d || 0
                }
            };
        }).sort((a, b) => (a.rank || 0) - (b.rank || 0)); // Sort by Rank
    }, [cryptoAssets, marketData]);

    const handleRefresh = async () => {
        if (symbols.length === 0) {
            toast({
                title: "Sin activos",
                description: "No hay criptomonedas configuradas",
                variant: "destructive"
            });
            return;
        }

        setIsRefreshing(true);
        try {
            await refreshMarketData();
            toast({ title: "Precios actualizados" });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            toast({
                title: "Error al actualizar",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Mercado Crypto"
                rightAction={
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="h-8 w-8"
                    >
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    </Button>
                }
            />

            {/* Timeframe Selector */}
            <div className="px-4 py-2 flex justify-center">
                <div className="flex bg-muted/30 rounded-lg p-1 gap-1">
                    {(["24h", "7d", "30d"] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                timeframe === tf
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf === "30d" ? "1m" : tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Crypto Grid */}
            <div className="px-4 py-2 pb-24">
                {aggregatedAssets.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
                        <p className="text-muted-foreground">No hay criptomonedas configuradas</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Añade activos desde la sección de cuenta
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {aggregatedAssets.map((asset) => {
                            const variation = asset.variations[timeframe];
                            const isPositive = variation >= 0;

                            return (
                                <div
                                    key={asset.symbol}
                                    className="group flex items-center justify-between py-3 px-2 rounded-xl transition-colors hover:bg-muted/30 border-b border-border/20 last:border-0"
                                >
                                    {/* Left: Rank + Logo + Symbol/Name */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-muted-foreground w-5 text-center">
                                            {asset.rank < 999999 ? `#${asset.rank}` : "-"}
                                        </span>
                                        <CryptoLogo symbol={asset.symbol} size={32} />
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="font-bold text-sm">{asset.symbol}</span>
                                                <span className="text-xs text-muted-foreground hidden sm:inline-block">{asset.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Price + Variation + Volume */}
                                    <div className="flex flex-col items-end gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm tabular-nums">
                                                {formatCryptoPrice(asset.currentPrice)}
                                            </p>

                                            <div className={cn(
                                                "flex items-center justify-end w-14 px-1 py-0.5 rounded text-[10px] font-bold tabular-nums",
                                                isPositive
                                                    ? "text-green-500 bg-green-500/10"
                                                    : "text-red-500 bg-red-500/10"
                                            )}>
                                                {isPositive ? "+" : ""}
                                                {variation.toFixed(2)}%
                                            </div>
                                        </div>
                                        {/* Volume sub-row */}
                                        <p className="text-[10px] text-muted-foreground/70 tabular-nums pr-1">
                                            {formatVolume(asset.volume24h)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
