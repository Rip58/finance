import { useState, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useAccountHoldings } from "@/hooks/useAccountHoldings";
import { useCurrentPrices } from "@/hooks/useCurrentPrices";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { CryptoLogo } from "@/components/dca/CryptoLogo";
import { useToast } from "@/hooks/use-toast";
import { cn, formatCurrency } from "@/lib/utils";

interface CryptoPageProps {
    user: User;
}

export function CryptoPage({ user }: CryptoPageProps) {
    const { toast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: holdings = [] } = useAccountHoldings(user.id);
    const { data: bankAccounts = [] } = useBankAccounts(user.id);

    // Get unique symbols from holdings
    const symbols = useMemo(() => {
        return [...new Set(holdings.map(h => h.symbol.toUpperCase()))];
    }, [holdings]);

    const { data: currentPrices = {}, refreshPrices } = useCurrentPrices(symbols);

    // Aggregate holdings by symbol
    const aggregatedHoldings = useMemo(() => {
        const bySymbol: Record<string, { quantity: number; accountNames: string[] }> = {};

        for (const holding of holdings) {
            const symbol = holding.symbol.toUpperCase();
            if (!bySymbol[symbol]) {
                bySymbol[symbol] = { quantity: 0, accountNames: [] };
            }
            bySymbol[symbol].quantity += holding.quantity;

            const account = bankAccounts.find(a => a.id === holding.bank_account_id);
            if (account && !bySymbol[symbol].accountNames.includes(account.name)) {
                bySymbol[symbol].accountNames.push(account.name);
            }
        }

        return Object.entries(bySymbol).map(([symbol, data]) => ({
            symbol,
            quantity: data.quantity,
            accountNames: data.accountNames,
            currentPrice: currentPrices[symbol] || 0,
            totalValue: data.quantity * (currentPrices[symbol] || 0),
            // Mock 24h change - in real app would fetch from API
            change24h: Math.random() * 20 - 10, // Random between -10% and +10%
        })).sort((a, b) => b.totalValue - a.totalValue);
    }, [holdings, bankAccounts, currentPrices]);

    const handleRefresh = async () => {
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

    const totalPortfolioValue = aggregatedHoldings.reduce((sum, holding) => sum + holding.totalValue, 0);

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
                </div>
            </div>

            {/* Crypto Grid */}
            <div className="px-4 pb-24">
                {aggregatedHoldings.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-card border border-border/50">
                        <p className="text-muted-foreground">No hay criptomonedas</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Añade activos desde la sección de cuentas
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {aggregatedHoldings.map((holding) => (
                            <div
                                key={holding.symbol}
                                className="rounded-2xl bg-card border border-border/50 p-4 hover:border-primary/30 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    {/* Logo & Symbol */}
                                    <div className="flex items-center gap-3">
                                        <CryptoLogo symbol={holding.symbol} size={40} />
                                        <div>
                                            <p className="font-semibold">{holding.symbol}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {holding.quantity.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Price & Change */}
                                    <div className="text-right">
                                        <p className="font-semibold">
                                            {formatCurrency(holding.currentPrice, "USD")}
                                        </p>
                                        <div className={cn(
                                            "flex items-center gap-1 text-xs font-medium",
                                            holding.change24h >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {holding.change24h >= 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                            <span>
                                                {holding.change24h >= 0 ? "+" : ""}
                                                {holding.change24h.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Value */}
                                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">Valor Total</p>
                                    <p className="font-semibold">{formatCurrency(holding.totalValue, "USDT")}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
