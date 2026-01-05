import { supabase } from "@/integrations/supabase/client";

const COINCAP_API = "https://api.coincap.io/v2";

// Map common symbols to CoinCap IDs
const SYMBOL_TO_ID: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binance-coin",
    SOL: "solana",
    XRP: "xrp",
    ADA: "cardano",
    DOGE: "dogecoin",
    DOT: "polkadot",
    MATIC: "polygon",
    LTC: "litecoin",
    AVAX: "avalanche",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
};

interface CoinCapAsset {
    id: string;
    symbol: string;
    priceUsd: string;
}

export async function fetchCryptoPrices(
    symbols: string[]
): Promise<Record<string, number>> {
    try {
        const prices: Record<string, number> = {};

        // Fetch prices from CoinCap
        for (const symbol of symbols) {
            const coinId = SYMBOL_TO_ID[symbol.toUpperCase()];
            if (!coinId) {
                console.warn(`No CoinCap ID found for symbol: ${symbol}`);
                continue;
            }

            const response = await fetch(`${COINCAP_API}/assets/${coinId}`);
            if (!response.ok) continue;

            const { data } = await response.json();
            if (data && data.priceUsd) {
                prices[symbol.toUpperCase()] = parseFloat(data.priceUsd);
            }
        }

        return prices;
    } catch (error) {
        console.error("Error fetching crypto prices:", error);
        throw error;
    }
}

export async function savePricesToDatabase(
    prices: Record<string, number>
): Promise<void> {
    try {
        const priceRecords = Object.entries(prices).map(([symbol, price]) => ({
            symbol: symbol.toUpperCase(),
            close_price: price,
            price_date: new Date().toISOString().split("T")[0],
        }));

        const { error } = await supabase.from("asset_prices").upsert(priceRecords, {
            onConflict: "symbol,price_date",
        });

        if (error) throw error;
    } catch (error) {
        console.error("Error saving prices to database:", error);
        throw error;
    }
}
