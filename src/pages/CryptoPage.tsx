import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
// import { MobilePageHeader } from "@/components/mobile/MobilePageHeader"; // Removed
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { useCryptoMarketData } from "@/hooks/useCryptoMarketData";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { updateInstitutionalPrices } from "@/lib/institutionalPrices";
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { InstitutionalMarketStatus } from "@/components/dca/InstitutionalMarketStatus";
import { BTCHalvingCountdown } from "@/components/dca/BTCHalvingCountdown";

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
const formatVolume = (volume: number | null | undefined): string => {
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
    const autoRefreshKeyRef = useRef("");

    const { data: cryptoAssets = [] } = useCryptoAssets(user.id);

    // Separate crypto and institutional assets
    const { cryptoOnlyAssets, institutionalAssets } = useMemo(() => {
        const crypto = cryptoAssets.filter(asset => asset.asset_type === 'crypto');
        const institutional = cryptoAssets.filter(asset => asset.asset_type === 'institutional');
        return { cryptoOnlyAssets: crypto, institutionalAssets: institutional };
    }, [cryptoAssets]);

    // Get crypto symbols for market data API (Binance/CoinGecko)
    const cryptoSymbols = useMemo(() => {
        return cryptoOnlyAssets.map(asset => asset.symbol.toUpperCase());
    }, [cryptoOnlyAssets]);

    // Get institutional symbols for DB prices
    const institutionalSymbols = useMemo(() => {
        return institutionalAssets.map(asset => asset.symbol.toUpperCase());
    }, [institutionalAssets]);

    // Use crypto market data hook for real-time crypto prices
    const { data: marketData = {}, refreshMarketData } = useCryptoMarketData(cryptoSymbols);

    // Use current prices hook to get institutional prices from DB
    const { data: dbPrices = {}, refreshPrices } = useCurrentPrices(institutionalSymbols);

    useEffect(() => {
        if (cryptoSymbols.length === 0) return;
        const refreshKey = cryptoSymbols.join("|");
        if (autoRefreshKeyRef.current === refreshKey) return;
        autoRefreshKeyRef.current = refreshKey;

        refreshMarketData().catch((error) => {
            console.error("Auto refresh market data failed:", error);
        });
    }, [cryptoSymbols, refreshMarketData]);

    // Aggregate crypto assets with market data
    const aggregatedCryptoAssets = useMemo(() => {
        return cryptoOnlyAssets.map(asset => {
            const symbol = asset.symbol.toUpperCase();
            const data = marketData[symbol];

            return {
                symbol: asset.symbol,
                name: asset.name,
                currentPrice: data?.price || 0,
                rank: data?.rank || 999999,
                volume24h: data?.volume24h || null,
                variations: {
                    "24h": data?.change24h ?? null,
                    "7d": data?.change7d ?? null,
                    "30d": data?.change30d ?? null
                }
            };
        }).sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }, [cryptoOnlyAssets, marketData]);

    const aggregatedInstitutionalAssets = useMemo(() => {
        return institutionalAssets.map(asset => {
            const symbol = asset.symbol.toUpperCase();
            const data = dbPrices[symbol] || { price: 0 };

            // Handle both simple number (old format) and object (new format)
            const price = typeof data === 'number' ? data : data.price || 0;
            const variations = typeof data === 'object' ? {
                "24h": data.change24h ?? null,
                "7d": data.change7d ?? null,
                "30d": data.change30d ?? null
            } : {
                "24h": null,
                "7d": null,
                "30d": null
            };

            return {
                symbol: asset.symbol,
                name: asset.name,
                currentPrice: price,
                rank: 999999,
                volume24h: null,
                variations
            };
        }).sort((a, b) => a.symbol.localeCompare(b.symbol)); // Sort alphabetically
    }, [institutionalAssets, dbPrices]);

    const handleRefresh = async () => {
        if (cryptoAssets.length === 0) {
            toast({
                title: "Sin activos",
                description: "No hay activos configurados",
                variant: "destructive"
            });
            return;
        }

        setIsRefreshing(true);
        try {
            // Refresh crypto prices (if any)
            if (cryptoSymbols.length > 0) {
                await refreshMarketData();
            }

            // Refresh institutional prices (if any)
            if (institutionalSymbols.length > 0) {
                await updateInstitutionalPrices(institutionalSymbols);
                // Force refresh of db prices
                await refreshPrices(institutionalSymbols);
            }

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
            <div className="container mx-auto p-4 space-y-6 pb-20 fade-in safe-area-pt">
                <PageHeader
                    title="Crypto"
                    description="Precios en tiempo real"
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="gap-2 h-8 px-2 text-muted-foreground hover:text-foreground -ml-2"
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                Actualizar
                            </Button>

                            <div className="h-4 w-px bg-border/40 mx-2" />

                            <div className="flex bg-muted/30 rounded-lg p-1 gap-1 shadow-sm border border-border/10">
                                {(["24h", "7d", "30d"] as Timeframe[]).map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-[10px] font-medium transition-all duration-200",
                                            timeframe === tf
                                                ? "bg-background shadow-sm text-foreground scale-105 font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tf === "30d" ? "1m" : tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    }
                />

                {/* Assets List */}
                <div className="px-4 py-2 pb-24 space-y-6">
                    {cryptoAssets.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border border-dashed border-border">
                            <p className="text-muted-foreground text-sm">No hay criptomonedas configuradas</p>
                            <p className="text-xs text-muted-foreground mt-1">Añade activos desde la sección de cuenta</p>
                        </div>
                    ) : (
                        <>
                            {/* Crypto Assets Section */}
                            {aggregatedCryptoAssets.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Criptomonedas</span>
                                        <div className="flex-1 h-px bg-border/40" />
                                        <span className="text-[10px] text-muted-foreground">{aggregatedCryptoAssets.length}</span>
                                    </div>
                                    <BTCHalvingCountdown />
                                    <div className="space-y-1.5 mt-2">
                                        {aggregatedCryptoAssets.map((asset) => {
                                            const variation = asset.variations[timeframe];
                                            const hasData = variation !== null;
                                            const isPositive = hasData && variation >= 0;

                                            return (
                                                <div
                                                    key={asset.symbol}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/40 border border-border/40 hover:bg-card/70 transition-all"
                                                >
                                                    {/* Logo */}
                                                    <CryptoLogo symbol={asset.symbol} size={28} />

                                                    {/* Symbol + Name */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold leading-tight">{asset.symbol}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{asset.name}</p>
                                                    </div>

                                                    {/* Price */}
                                                    <p className="text-sm font-bold tabular-nums text-right">
                                                        {formatCryptoPrice(asset.currentPrice)}
                                                    </p>

                                                    {/* % badge */}
                                                    <div className={cn(
                                                        "text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-lg shrink-0 min-w-[52px] text-center",
                                                        !hasData
                                                            ? "text-muted-foreground bg-muted/50"
                                                            : isPositive
                                                                ? "text-green-600 bg-green-500/10"
                                                                : "text-red-600 bg-red-500/10"
                                                    )}>
                                                        {hasData ? `${isPositive ? "+" : ""}${variation.toFixed(2)}%` : "—"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Institutional Assets Section */}
                            {aggregatedInstitutionalAssets.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Institucionales</span>
                                        <div className="flex-1 h-px bg-border/40" />
                                        <span className="text-[10px] text-muted-foreground">{aggregatedInstitutionalAssets.length}</span>
                                    </div>
                                    <InstitutionalMarketStatus />
                                    <div className="space-y-1.5 mt-2">
                                        {aggregatedInstitutionalAssets.map((asset) => {
                                            const variation = asset.variations[timeframe];
                                            const hasData = variation !== null;
                                            const isPositive = hasData && variation >= 0;

                                            return (
                                                <div
                                                    key={asset.symbol}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/40 border border-amber-500/20 hover:bg-card/70 transition-all"
                                                >
                                                    {/* Logo */}
                                                    <CryptoLogo symbol={asset.symbol} size={28} />

                                                    {/* Symbol + Name */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold leading-tight">{asset.symbol}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{asset.name}</p>
                                                    </div>

                                                    {/* Price */}
                                                    <p className="text-sm font-bold tabular-nums text-right">
                                                        {formatCryptoPrice(asset.currentPrice)}
                                                    </p>

                                                    {/* % badge */}
                                                    <div className={cn(
                                                        "text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-lg shrink-0 min-w-[52px] text-center",
                                                        !hasData
                                                            ? "text-muted-foreground bg-muted/50"
                                                            : isPositive
                                                                ? "text-green-600 bg-green-500/10"
                                                                : "text-red-600 bg-red-500/10"
                                                    )}>
                                                        {hasData ? `${isPositive ? "+" : ""}${variation.toFixed(2)}%` : "—"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}
