import { supabase } from "@/integrations/supabase/client";

export async function updateCryptoPrices(
    symbols: string[]
): Promise<void> {
    try {
        const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];

        if (uniqueSymbols.length === 0) return;

        console.log("Updating prices via Edge Function for:", uniqueSymbols);

        const { data, error } = await supabase.functions.invoke("get-asset-prices", {
            body: { symbols: uniqueSymbols },
        });

        if (error) {
            console.error("Error invoking get-asset-prices:", error);
            throw error;
        }

        if (data && !data.success) {
            // Even if function invocation worked, it might have returned an applicative error
            throw new Error(data.error || "Unknown error updating prices");
        }

        // Edge function handles saving to DB, so we don't need to do anything else.

    } catch (error) {
        console.error("Error updating crypto prices:", error);
        throw error;
    }
}
