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
        // Simplified auth: just check for authorization header presence
        const authHeader = req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            console.log('Authorization header present');
        }

        const { symbols, historical } = await req.json();

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return new Response(
                JSON.stringify({ error: "symbols array is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get API keys
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- HISTORICAL DATA MODE (Backfill) ---
        if (historical) {
            console.log(`Starting historical backfill for: ${symbols.join(', ')}`);
            const results: any[] = [];

            for (const symbol of symbols) {
                // Binance API for historical klines (candlesticks)
                // Symbol format: BTCUSDT
                const pair = `${symbol.toUpperCase()}USDT`;
                try {
                    console.log(`Fetching history for ${pair}...`);
                    // Interval 1d, Limit 90 days
                    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=90`;
                    const historyRes = await fetch(binanceUrl);

                    if (historyRes.ok) {
                        const klines = await historyRes.json();
                        // Binance kline format: 
                        // [
                        //   1499040000000,      // Open time
                        //   "0.01634790",       // Open
                        //   "0.80000000",       // High
                        //   "0.01575800",       // Low
                        //   "0.01577100",       // Close
                        //   ...
                        // ]

                        const updates = klines.map((k: any) => ({
                            symbol: symbol.toUpperCase(),
                            price_date: new Date(k[0]).toISOString().split('T')[0], // YYYY-MM-DD
                            open_price: parseFloat(k[1]),
                            high_price: parseFloat(k[2]),
                            low_price: parseFloat(k[3]),
                            close_price: parseFloat(k[4])
                        }));

                        if (updates.length > 0) {
                            const { error } = await supabase
                                .from("asset_prices")
                                .upsert(updates, { onConflict: "symbol,price_date" });

                            if (error) console.error(`Error saving history for ${symbol}:`, error);
                            else {
                                console.log(`Saved ${updates.length} days of history for ${symbol}`);
                                results.push({ symbol, days: updates.length });
                            }
                        }
                    } else {
                        console.warn(`Binance API error for ${pair}: ${historyRes.status}`);
                    }
                } catch (err) {
                    console.error(`Error fetching history for ${symbol}:`, err);
                }

                // Avoid rate limits
                await new Promise(r => setTimeout(r, 200));
            }

            return new Response(
                JSON.stringify({ success: true, mode: 'historical', results }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- LIVE DATA MODE (Binance Implementation) ---
        const MAX_SYMBOLS = 50;
        if (symbols.length > MAX_SYMBOLS) {
            return new Response(
                JSON.stringify({ error: `Maximum ${MAX_SYMBOLS} symbols allowed` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const validSymbolRegex = /^[A-Za-z0-9]{1,10}$/;
        const sanitizedSymbols = symbols
            .filter((s): s is string => typeof s === 'string' && validSymbolRegex.test(s))
            .map(s => s.toUpperCase());

        if (sanitizedSymbols.length === 0) {
            return new Response(
                JSON.stringify({ error: "No valid symbols provided" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Fetching Binance prices for: ${sanitizedSymbols.join(', ')}`);

        // Prepare symbols for Binance: "BTC" -> "BTCUSDT"
        const binanceSymbols = sanitizedSymbols.map(s => `"${s}USDT"`).join(",");

        // Use Binance Ticker 24hr endpoint for price + 24h stats
        const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=[${binanceSymbols}]`;

        const binanceResponse = await fetch(binanceUrl);

        if (!binanceResponse.ok) {
            const errorText = await binanceResponse.text();
            console.error(`Binance API error: ${binanceResponse.status} - ${errorText}`);
            return new Response(
                JSON.stringify({ error: `Binance API error: ${binanceResponse.status}` }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const binanceData = await binanceResponse.json();
        // type: Array<{ symbol: string, lastPrice: string, priceChangePercent: string, quoteVolume: string, ... }>

        console.log(`Binance response received for ${Array.isArray(binanceData) ? binanceData.length : 0} symbols`);

        const today = new Date().toISOString().split("T")[0];
        const prices: Record<string, number> = {};

        if (Array.isArray(binanceData)) {
            for (const item of binanceData) {
                // item.symbol is "BTCUSDT". We want "BTC".
                const symbol = item.symbol.replace("USDT", "");

                if (sanitizedSymbols.includes(symbol)) {
                    const price = parseFloat(item.lastPrice);
                    prices[symbol] = price;

                    const { error } = await supabase
                        .from("asset_prices")
                        .upsert(
                            {
                                symbol: symbol,
                                close_price: price,
                                price_date: today,
                                // Map Binance stats
                                cmc_rank: null, // Not available in ticker/24hr
                                volume_24h: parseFloat(item.quoteVolume), // Volume in USDT
                                percent_change_24h: parseFloat(item.priceChangePercent),
                                // Others not available, set null or 0
                                percent_change_1h: null,
                                percent_change_7d: null,
                                percent_change_30d: null
                            },
                            { onConflict: "symbol,price_date" } // Update if exists for today
                        );

                    if (error) {
                        console.error(`Error upserting price for ${symbol}:`, error);
                    } else {
                        console.log(`Saved price for ${symbol}: $${price.toFixed(2)}`);
                    }
                }
            }
        }

        console.log(`Successfully processed ${Object.keys(prices).length} prices`);

        return new Response(
            JSON.stringify({ success: true, prices }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error in get-asset-prices-v2:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
