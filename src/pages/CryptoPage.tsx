import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useCryptoAssets } from "@/hooks/useCryptoAssets";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";

interface CryptoPageProps {
    user: User;
}

export function CryptoPage({ user }: CryptoPageProps) {
    const { toast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

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

            // Mock 24h change - in production would fetch from CMC API
            const change24h = Math.random() * 20 - 10;

            return {
                symbol: asset.symbol,
                name: asset.name,
                currentPrice,
                change24h,
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
                    >
                        <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                    </Button>
                }
            />

            {/* Crypto Grid */}
            <div className="px-4 py-6 pb-24">
                {aggregatedAssets.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
                        <p className="text-muted-foreground">No hay criptomonedas configuradas</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Añade activos desde la sección de cuenta
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {aggregatedAssets.map((asset) => (
                            <div
                                key={asset.symbol}
                                className="rounded-2xl bg-card border border-border/50 p-4 flex items-center justify-between"
                            >
                                {/* Logo & Symbol */}
                                <div className="flex items-center gap-3">
                                    <CryptoLogo symbol={asset.symbol} size={40} />
                                    <div>
                                        <p className="font-bold text-lg">{asset.symbol}</p>
                                        <p className="text-sm text-muted-foreground">{asset.name}</p>
                                    </div>
                                </div>

                                {/* Price & Change */}
                                <div className="text-right">
                                    <p className="font-bold text-lg">
                                        {asset.currentPrice > 0
                                            ? formatCurrency(asset.currentPrice, "USD")
                                            : "—"
                                        }
                                    </p>
                                    {asset.currentPrice > 0 && (
                                        <div className={cn(
                                            "flex items-center gap-1 text-sm font-medium justify-end",
                                            asset.change24h >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {asset.change24h >= 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                            <span>
                                                {asset.change24h >= 0 ? "+" : ""}
                                                {asset.change24h.toFixed(2)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
