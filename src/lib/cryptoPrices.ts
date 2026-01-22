import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export async function updateCryptoPrices(
    symbols: string[]
): Promise<void> {
    logger.log("[cryptoPrices] 🚀 Starting updateCryptoPrices with symbols:", symbols);

    try {
        const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
        logger.log("[cryptoPrices] ✅ Unique symbols after dedup:", uniqueSymbols);

        if (uniqueSymbols.length === 0) {
            logger.warn("[cryptoPrices] ⚠️ No symbols to update, returning early");
            return;
        }

        // Get current session to ensure we have a valid token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            logger.error("[cryptoPrices] ❌ No valid session:", sessionError);
            throw new Error("Not authenticated");
        }

        logger.log("[cryptoPrices] 🔑 Session obtained, token valid");
        logger.log("[cryptoPrices] 📡 Invoking Edge Function 'get-asset-prices-v2'...");

        const { data, error } = await supabase.functions.invoke("get-asset-prices-v2", {
            body: { symbols: uniqueSymbols },
        });

        logger.log("[cryptoPrices] 📥 Edge Function response:", { data, error });

        if (error) {
            logger.error("[cryptoPrices] ❌ Edge Function invocation error:", error);
            throw new Error(`Edge Function failed: ${error.message || JSON.stringify(error)}`);
        }

        if (data && !data.success) {
            logger.error("[cryptoPrices] ❌ Edge Function returned error:", data.error);
            throw new Error(data.error || "Unknown error updating prices");
        }

        const missingSymbols = Array.isArray(data?.missingSymbols) ? data.missingSymbols : [];
        if (missingSymbols.length > 0) {
            logger.warn("[cryptoPrices] ⚠️ Missing Binance symbols, falling back to CMC:", missingSymbols);
            const { data: cmcData, error: cmcError } = await supabase.functions.invoke("get-asset-prices", {
                body: { symbols: missingSymbols },
            });

            if (cmcError) {
                logger.warn("[cryptoPrices] ⚠️ CMC fallback failed:", cmcError);
            } else if (cmcData && !cmcData.success) {
                logger.warn("[cryptoPrices] ⚠️ CMC fallback error:", cmcData.error);
            }
        }

        logger.log("[cryptoPrices] ✅ Prices updated successfully:", data?.prices);

    } catch (error) {
        logger.error("[cryptoPrices] 💥 Fatal error:", error);
        throw error;
    }
}
