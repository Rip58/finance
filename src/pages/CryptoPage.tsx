import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";

interface CryptoPageProps {
    user: User;
}

// Helper to format crypto prices with appropriate precision
const formatCryptoPrice = (price: number): string => {
    if (price === 0) return "—";

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

    const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(symbols);

    // Aggregate assets with prices
    const aggregatedAssets = useMemo(() => {
        return cryptoAssets.map(asset => {
            const symbol = asset.symbol.toUpperCase();
            const currentPrice = currentPrices[symbol] || 0;

            // Mock variations - in production would fetch from CMC API
            // using symbol string to generate consistent pseudo-random numbers
            const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const random = (offset: number) => (Math.sin(seed + offset) * 20); // -20 to +20 range

            return {
                symbol: asset.symbol,
                name: asset.name,
                currentPrice,
                variations: {
                    "24h": random(1),
                    "7d": random(2),
                    "30d": random(3)
                }
            };
        }).sort((a, b) => b.currentPrice - a.currentPrice);
    }, [cryptoAssets, currentPrices]);

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
            await refreshPrices();
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
                                    {/* Left: Logo + Symbol/Name */}
                                    <div className="flex items-center gap-3">
                                        <CryptoLogo symbol={asset.symbol} size={32} />
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="font-bold text-sm">{asset.symbol}</span>
                                                <span className="text-xs text-muted-foreground hidden sm:inline-block">{asset.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Price + Variation */}
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-semibold text-sm tabular-nums">
                                                {formatCryptoPrice(asset.currentPrice)}
                                            </p>
                                        </div>

                                        <div className={cn(
                                            "flex items-center justify-end w-16 px-1.5 py-0.5 rounded text-xs font-medium tabular-nums",
                                            isPositive
                                                ? "text-green-500 bg-green-500/10"
                                                : "text-red-500 bg-red-500/10"
                                        )}>
                                            {isPositive ? "+" : ""}
                                            {variation.toFixed(2)}%
                                        </div>
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
