import { supabase } from "@/integrations/supabase/client";

export async function updateCryptoPrices(
    symbols: string[]
): Promise<void> {
    console.log("[cryptoPrices] 🚀 Starting updateCryptoPrices with symbols:", symbols);

    try {
        const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
        console.log("[cryptoPrices] ✅ Unique symbols after dedup:", uniqueSymbols);

        if (uniqueSymbols.length === 0) {
            console.warn("[cryptoPrices] ⚠️ No symbols to update, returning early");
            return;
        }

        console.log("[cryptoPrices] 📡 Invoking Edge Function 'get-asset-prices'...");

        const { data, error } = await supabase.functions.invoke("get-asset-prices", {
            body: { symbols: uniqueSymbols },
        });

        console.log("[cryptoPrices] 📥 Edge Function response:", { data, error });

        if (error) {
            console.error("[cryptoPrices] ❌ Edge Function invocation error:", error);
            throw new Error(`Edge Function failed: ${error.message || JSON.stringify(error)}`);
        }

        if (data && !data.success) {
            console.error("[cryptoPrices] ❌ Edge Function returned error:", data.error);
            throw new Error(data.error || "Unknown error updating prices");
        }

        console.log("[cryptoPrices] ✅ Prices updated successfully:", data?.prices);

    } catch (error) {
        console.error("[cryptoPrices] 💥 Fatal error:", error);
        throw error;
    }
}
