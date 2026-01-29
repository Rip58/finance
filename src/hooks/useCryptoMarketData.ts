import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateCryptoPrices } from "@/lib/cryptoPrices";

export interface CryptoMarketData {
    price: number;
    rank: number | null;
    volume24h: number | null;
    change1h: number | null;
    change24h: number | null;
    change7d: number | null;
    change30d: number | null;
}

export function useCryptoMarketData(symbols: string[]) {
    const queryClient = useQueryClient();
    const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];

    const query = useQuery({
        queryKey: ["crypto-market-data", uniqueSymbols],
        queryFn: async (): Promise<Record<string, CryptoMarketData>> => {
            if (uniqueSymbols.length === 0) return {};

            // Define the expected shape of the database response including new columns
            interface AssetPriceRow {
                symbol: string;
                close_price: number;
                price_date: string;
                cmc_rank: number | null;
                volume_24h: number | null;
                percent_change_1h: number | null;
                percent_change_24h: number | null;
                percent_change_7d: number | null;
                percent_change_30d: number | null;
            }

            const { data, error } = await supabase
                .from("asset_prices")
                .select("*")
                .in("symbol", uniqueSymbols)
                .order("price_date", { ascending: false });

            if (error) throw error;

            // Cast data to our expanded type since generated types might be stale
            const rows = data as unknown as AssetPriceRow[];

            // Group by symbol, keep most recent
            const marketData: Record<string, CryptoMarketData> = {};

            // Assuming data is sorted by date desc, so first occurrence is latest
            for (const p of rows) {
                if (!marketData[p.symbol]) {
                    marketData[p.symbol] = {
                        price: p.close_price,
                        rank: p.cmc_rank,
                        volume24h: p.volume_24h,
                        change1h: p.percent_change_1h,
                        change24h: p.percent_change_24h,
                        change7d: p.percent_change_7d,
                        change30d: p.percent_change_30d
                    };
                }
            }
            return marketData;
        },
        enabled: uniqueSymbols.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const refreshMarketData = async () => {
        if (uniqueSymbols.length === 0) return;

        try {
            // Split symbols to avoid cross-pollution
            // We need the constant. We can import it or define it. 
            // Since this is inside an async function, dynamic import is fine.
            const { INSTITUTIONAL_SYMBOLS } = await import("@/lib/finance_api");

            const institutionalSymbols = uniqueSymbols.filter(s => INSTITUTIONAL_SYMBOLS.includes(s));
            const cryptoSymbols = uniqueSymbols.filter(s => !INSTITUTIONAL_SYMBOLS.includes(s));

            const promises = [];

            // 1. Update Crypto (via Edge Function) using only crypto symbols
            if (cryptoSymbols.length > 0) {
                promises.push(
                    updateCryptoPrices(cryptoSymbols).catch(e => console.error("Crypto update failed:", e))
                );
            }

            // 2. Update Institutional (via FMP) using only institutional symbols
            if (institutionalSymbols.length > 0) {
                const { updateInstitutionalPrices } = await import("@/lib/institutionalPrices");
                promises.push(
                    updateInstitutionalPrices(institutionalSymbols).catch(e => console.error("Institutional update failed:", e))
                );
            }

            await Promise.all(promises);

            queryClient.invalidateQueries({ queryKey: ["crypto-market-data"] });
        } catch (err) {
            console.error("Error refreshing market data:", err);
            // Don't throw to UI? User gets a toast if we do? 
            // The original logic threw. Let's throw if both fail?
            // Actually, we caught individual errors above, so this catch block might not be reached unless import fails.
        }
    };

    return { ...query, refreshMarketData };
}
