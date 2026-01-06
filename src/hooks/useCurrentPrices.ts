import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentPrices(symbols: string[]) {
  const queryClient = useQueryClient();
  const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];

  const query = useQuery({
    queryKey: ["current-prices", uniqueSymbols],
    queryFn: async (): Promise<Record<string, number>> => {
      if (uniqueSymbols.length === 0) return {};

      const { data, error } = await supabase
        .from("asset_prices")
        .select("symbol, close_price, price_date")
        .in("symbol", uniqueSymbols)
        .order("price_date", { ascending: false });

      if (error) throw error;

      // Group by symbol, keep most recent
      const latestPrices: Record<string, number> = {};
      for (const p of data || []) {
        if (!latestPrices[p.symbol]) {
          latestPrices[p.symbol] = p.close_price;
        }
      }
      return latestPrices;
    },
    enabled: uniqueSymbols.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const refreshPrices = async (symbolsOverride?: string[]) => {
    const symbolsToUse = symbolsOverride || uniqueSymbols;
    if (symbolsToUse.length === 0) return;

    try {
      // Import dynamically to avoid circular dependencies
      const { updateCryptoPrices } = await import("@/lib/cryptoPrices");

      // Update prices using Edge Function (which fetches from CMC and saves to DB)
      await updateCryptoPrices(symbolsToUse);

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ["current-prices"] });
    } catch (err) {
      console.error("Error refreshing prices:", err);
      throw err;
    }
  };

  return { ...query, refreshPrices };
}
