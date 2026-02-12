import { supabase } from "@/integrations/supabase/client";
import { fetchAssetPrice } from "./finance_api";

/**
 * Updates prices for institutional assets by fetching from Yahoo (via proxy)
 * and inserting into the asset_prices table.
 * @param symbols List of symbols to update (e.g. ['GC=F', '^GSPC'])
 */
export async function updateInstitutionalPrices(symbols: string[]): Promise<void> {
    if (!symbols || symbols.length === 0) return;

    const uniqueSymbols = [...new Set(symbols)];
    const { resolveAssetSymbol } = await import("./finance_api");

    console.log("[InstitutionalPrices] Updating symbols:", uniqueSymbols);

    // Helper delay function
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        // Execute sequentially to avoid API rate limits (Alpha Vantage: 5 calls/min)
        for (let i = 0; i < uniqueSymbols.length; i++) {
            const originalSymbol = uniqueSymbols[i];
            const yahooSymbol = resolveAssetSymbol(originalSymbol);

            try {
                // Add delay between requests (except the first one)
                // 2 seconds delay is sufficient for Yahoo Finance via proxy
                if (i > 0) {
                    console.log(`[InstitutionalPrices] Waiting 2s before fetching ${originalSymbol}...`);
                    await delay(2000);
                }

                console.log(`[InstitutionalPrices] Fetching ${originalSymbol} (${yahooSymbol})...`);
                const data = await fetchAssetPrice(yahooSymbol);

                // Use the actual trading day from the API, or fallback to today
                const priceDate = data.lastTradingDay || new Date().toISOString().split('T')[0];

                // Upsert into asset_prices table to handle existing entries gracefully
                const { error } = await supabase
                    .from("asset_prices")
                    .upsert({
                        symbol: originalSymbol, // Store as the USER's symbol (e.g. XAU)
                        price_date: priceDate, // YYYY-MM-DD
                        close_price: data.price,
                        volume_24h: data.volume,
                        percent_change_24h: data.changePercent,
                        percent_change_7d: data.change7d, // Persist 7d variation
                        percent_change_30d: data.change30d, // Persist 30d variation
                        market_closed: data.marketClosed || false,
                    }, { onConflict: 'symbol,price_date' });

                if (error) {
                    console.error(`[InstitutionalPrices] ❌ Error inserting price for ${originalSymbol}:`, error);
                } else {
                    console.log(`[InstitutionalPrices] ✅ SUCCESS Updated price for ${originalSymbol}: ${data.price}`);
                }
            } catch (err) {
                console.error(`[InstitutionalPrices] ❌ Failed to fetch/update ${originalSymbol}:`, err);
            }
        }
    } catch (error) {
        console.error("[InstitutionalPrices] Fatal error:", error);
    }
}
