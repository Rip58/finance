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

                // Cleanup: Delete specific existing entry for today to avoid duplicates/bad data persistence
                // This ensures we replace any "crypto-polluted" data with the correct FMP data
                await supabase
                    .from("asset_prices")
                    .delete()
                    .eq("symbol", originalSymbol)
                    .eq("price_date", today);

                const { error } = await supabase
                    .from("asset_prices")
                    .insert({
                        symbol: originalSymbol, // Store as the USER's symbol (e.g. XAU)
                        price_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                        close_price: data.price,
                        volume_24h: data.volume,
                        percent_change_24h: data.changePercent, // Will be null if market is closed
                        market_closed: data.marketClosed || false, // NEW: Store market status
                    });

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
