import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { updateCryptoPrices } from "@/lib/cryptoPrices";

export function useCurrentPrices(symbols: string[]) {
  const queryClient = useQueryClient();
  const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
  const stableSymbols = uniqueSymbols.filter(symbol => symbol === "USDT");
  const binanceSymbols = uniqueSymbols.filter(symbol => symbol !== "USDT");

  const query = useQuery({
    queryKey: ["current-prices", uniqueSymbols],
    queryFn: async (): Promise<Record<string, number>> => {
      if (uniqueSymbols.length === 0) return {};

      try {
        const prices: Record<string, number> = {};
        for (const symbol of stableSymbols) {
          prices[symbol] = 1;
        }

        if (binanceSymbols.length === 0) return prices;

        const binancePairs = binanceSymbols.map(symbol => `${symbol}USDT`);
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(binancePairs))}`;
        const response = await fetch(url);

        if (!response.ok) {
          // Fallback to DB if Binance fails (e.g. strict firewall or rate limit)
          console.warn("Binance API failed, falling back to DB", response.status);
          throw new Error("Binance fetch failed");
        }

        const data = await response.json();
        // Data format: [{ symbol: "BTCUSDT", price: "65000.00" }, ...]

        if (Array.isArray(data)) {
          for (const item of data) {
            const symbol = item.symbol.replace("USDT", ""); // Remove USDT suffix
            if (binanceSymbols.includes(symbol)) {
              prices[symbol] = parseFloat(item.price);
            }
          }
        }

        // If we missed any symbols (maybe not USDT pair?), try DB fallback for those?
        // For now, let's just return what we found.
        return prices;

      } catch (e) {
        console.error("Error fetching live prices:", e);
        // Fallback to Supabase DB on error
        const { data, error } = await supabase
          .from("asset_prices")
          .select("symbol, close_price, price_date")
          .in("symbol", uniqueSymbols)
          .order("price_date", { ascending: false });

        if (error) throw error;

        const latestPrices: Record<string, number> = {};
        for (const symbol of stableSymbols) {
          latestPrices[symbol] = 1;
        }
        for (const p of data || []) {
          if (!latestPrices[p.symbol]) {
            latestPrices[p.symbol] = p.close_price;
          }
        }
        return latestPrices;
      }
    },
    enabled: uniqueSymbols.length > 0,
    staleTime: 2000,
    refetchInterval: 5000, // Update every 5 seconds
    refetchIntervalInBackground: false,
  });

  const refreshPrices = async (symbolsOverride?: string[]) => {
    const symbolsToUse = symbolsOverride || uniqueSymbols;

    // Also invalidate to leverage the live fetch immediately
    queryClient.invalidateQueries({ queryKey: ["current-prices"] });

    // Optional: We still trigger the Edge Function to PERSIST the data to DB
    // This supports the "Refresh" button's intention to save/update history
    if (symbolsToUse.length > 0) {
      try {
        await updateCryptoPrices(symbolsToUse);
      } catch (e) {
        console.error("Background update failed", e);
      }
    }
  };

  return { ...query, refreshPrices };
}
