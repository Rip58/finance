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
    const { data: holdings = [] } = useAccountHoldings(user.id);

    // Get symbols from crypto_assets
    const symbols = useMemo(() => {
        return cryptoAssets.map(asset => asset.symbol.toUpperCase());
    }, [cryptoAssets]);

    const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(symbols);

    // Aggregate holdings by symbol and calculate totals
    const aggregatedAssets = useMemo(() => {
        return cryptoAssets.map(asset => {
            const symbol = asset.symbol.toUpperCase();

            // Sum all holdings for this symbol across all accounts
            const totalQuantity = holdings
                .filter(h => h.symbol.toUpperCase() === symbol)
                .reduce((sum, h) => sum + h.quantity, 0);

            const currentPrice = currentPrices[symbol] || 0;
            const totalValue = totalQuantity * currentPrice;

            // Mock 24h change - in production would fetch from CMC API
            const change24h = Math.random() * 20 - 10;

            return {
                symbol: asset.symbol,
                name: asset.name,
                quantity: totalQuantity,
                currentPrice,
                totalValue,
                change24h,
            };
        }).sort((a, b) => b.totalValue - a.totalValue);
    }, [cryptoAssets, holdings, currentPrices]);

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

    const totalPortfolioValue = aggregatedAssets.reduce((sum, asset) => sum + asset.totalValue, 0);

    return (
        <MobileLayout>
            <MobilePageHeader
                title="Crypto"
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

            {/* Total Portfolio Value */}
            <div className="px-4 py-4">
                <div className="rounded-3xl glass-panel p-6">
                    <p className="text-sm text-muted-foreground">Valor Total Portfolio</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalPortfolioValue, "USDT")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {aggregatedAssets.length} activos
                    </p>
                </div>
            </div>

            {/* Crypto Grid */}
            <div className="px-4 pb-24">
                {aggregatedAssets.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
                        <p className="text-muted-foreground">No hay criptomonedas configuradas</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Añade activos desde la sección de cuenta
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {aggregatedAssets.map((asset) => {
                            const hasHoldings = asset.quantity > 0;

                            return (
                                <div
                                    key={asset.symbol}
                                    className={cn(
                                        "rounded-2xl bg-card border p-4 transition-colors",
                                        hasHoldings
                                            ? "border-primary/30 hover:border-primary/50"
                                            : "border-border/30 opacity-50"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        {/* Logo & Symbol */}
                                        <div className="flex items-center gap-3">
                                            <CryptoLogo symbol={asset.symbol} size={40} />
                                            <div>
                                                <p className="font-semibold">{asset.symbol}</p>
                                                <p className="text-xs text-muted-foreground">{asset.name}</p>
                                            </div>
                                        </div>

                                        {/* Price & Change */}
                                        <div className="text-right">
                                            <p className="font-semibold">
                                                {asset.currentPrice > 0
                                                    ? formatCurrency(asset.currentPrice, "USD")
                                                    : "—"
                                                }
                                            </p>
                                            {asset.currentPrice > 0 && (
                                                <div className={cn(
                                                    "flex items-center gap-1 text-xs font-medium justify-end",
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

                                    {/* Holdings Info */}
                                    {hasHoldings && (
                                        <div className="mt-3 pt-3 border-t border-border/50">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Cantidad</span>
                                                <span className="font-medium">
                                                    {asset.quantity.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mt-1">
                                                <span className="text-muted-foreground">Valor Total</span>
                                                <span className="font-semibold">
                                                    {formatCurrency(asset.totalValue, "USDT")}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {!hasHoldings && (
                                        <div className="mt-2 text-xs text-muted-foreground text-center">
                                            Sin holdings
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
