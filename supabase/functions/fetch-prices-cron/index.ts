import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch Distinct Symbols from Assets table
        // We only want to track prices for assets that users actually hold
        const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('symbol')
            // .neq('quantity', 0) // Optional: only held assets
            .order('symbol');

        if (assetsError) throw assetsError;

        if (!assets || assets.length === 0) {
            console.log("No assets found to track.");
            return new Response(JSON.stringify({ message: "No assets to track" }), { headers: corsHeaders });
        }

        // Institutional symbols to exclude from CMC/Crypto fetches
        const INSTITUTIONAL_SYMBOLS = [
            'XAU', 'GOLD',
            'SPY', 'SP500', 'S&P500',
            'XAG', 'SILVER',
            'EUR', 'EURUSD',
            'AAPL', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'NFLX',
            'USD', 'USDT', 'USDC' // Stablecoins or Fiat might handle differently, but good to check
        ];

        // Get unique symbols, filtering out institutional ones
        const uniqueSymbols = [...new Set(assets.map(a => a.symbol.toUpperCase()))]
            .filter(symbol => !INSTITUTIONAL_SYMBOLS.includes(symbol));

        console.log(`Tracking prices for ${uniqueSymbols.length} symbols: ${uniqueSymbols.join(', ')}`);

        // 3. Fetch Prices from CoinMarketCap
        const apiKey = Deno.env.get("COINMARKETCAP_API_KEY") || Deno.env.get("CMC_api") || "331ccac7-4ea8-4cb8-9a9e-5334db08817b";

        if (!apiKey) throw new Error("CMC API Key not found");

        const cmcResponse = await fetch(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${uniqueSymbols.join(",")}&convert=USD`,
            {
                headers: {
                    "X-CMC_PRO_API_KEY": apiKey,
                    "Accept": "application/json",
                },
            }
        );

        if (!cmcResponse.ok) {
            throw new Error(`CMC API Error: ${cmcResponse.statusText}`);
        }

        const cmcData = await cmcResponse.json();
        const operations = [];
        const timestamp = new Date().toISOString();

        // 4. Prepare Batch Insert
        for (const symbol of uniqueSymbols) {
            const coinData = cmcData.data?.[symbol];
            if (coinData?.quote?.USD?.price) {
                const quote = coinData.quote.USD;

                operations.push({
                    symbol: symbol,
                    price: quote.price,
                    timestamp: timestamp, // Common timestamp for this batch
                    cmc_rank: coinData.cmc_rank,
                    volume_24h: quote.volume_24h,
                    percent_change_1h: quote.percent_change_1h,
                    percent_change_24h: quote.percent_change_24h,
                    percent_change_7d: quote.percent_change_7d
                });
            }
        }

        // 5. Insert into asset_price_history
        if (operations.length > 0) {
            const { error: insertError } = await supabase
                .from('asset_price_history')
                .insert(operations);

            if (insertError) throw insertError;
            console.log(`Successfully saved ${operations.length} price points.`);

            // OPTIONAL: Update the main 'asset_prices' table too (the daily one) so the UI that relies on it still works
            // This is effectively "Upsert current price"
            for (const op of operations) {
                await supabase
                    .from('asset_prices')
                    .upsert({
                        symbol: op.symbol,
                        close_price: op.price,
                        price_date: timestamp.split('T')[0], // YYYY-MM-DD
                        cmc_rank: op.cmc_rank,
                        volume_24h: op.volume_24h,
                        percent_change_1h: op.percent_change_1h,
                        percent_change_24h: op.percent_change_24h,
                        percent_change_7d: op.percent_change_7d,
                        percent_change_30d: 0 // CMC simple quote might not have this, leave 0 or keep existing
                    }, { onConflict: 'symbol,price_date' });
            }
        }

        return new Response(
            JSON.stringify({ success: true, count: operations.length }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Cron Job Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
