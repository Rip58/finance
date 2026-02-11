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

    try {
        const promises = uniqueSymbols.map(async (originalSymbol) => {
            const yahooSymbol = resolveAssetSymbol(originalSymbol);
            try {
                const data = await fetchAssetPrice(yahooSymbol);

                // Insert into asset_prices table
                // We should store using the ORIGINAL symbol (e.g. XAU) so queries match?
                // OR we store the Yahoo symbol and map on read?
                // The current design suggests `asset_prices` uses the same symbol as `crypto_assets` (original).
                // So we insert using `originalSymbol` but the price from `yahooSymbol`.
                const today = new Date().toISOString().split('T')[0];

                // Upsert into asset_prices table to handle existing entries gracefully
                const { error } = await supabase
                    .from("asset_prices")
                    .upsert({
                        symbol: originalSymbol, // Store as the USER's symbol (e.g. XAU)
                        price_date: today, // YYYY-MM-DD
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
        });

        await Promise.all(promises);
    } catch (error) {
        console.error("[InstitutionalPrices] Fatal error:", error);
    }
}
