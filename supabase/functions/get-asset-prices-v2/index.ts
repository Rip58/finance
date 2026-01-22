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
        const validSymbolRegex = /^[A-Za-z0-9]{1,10}$/;
        const sanitizedSymbols = symbols
            .filter((s): s is string => typeof s === 'string' && validSymbolRegex.test(s))
            .map(s => s.toUpperCase());
        const uniqueSymbols = [...new Set(sanitizedSymbols)];

        if (uniqueSymbols.length === 0) {
            return new Response(
                JSON.stringify({ error: "No valid symbols provided" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const stableSymbols = uniqueSymbols.filter(symbol => symbol === "USDT") as string[];
        const binanceSymbols = uniqueSymbols.filter(symbol => symbol !== "USDT");

        if (uniqueSymbols.length > MAX_SYMBOLS) {
            return new Response(
                JSON.stringify({ error: `Maximum ${MAX_SYMBOLS} symbols allowed` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const today = new Date().toISOString().split("T")[0];
        const prices: Record<string, number> = {};

        for (const symbol of stableSymbols) {
            prices[symbol] = 1;
            const { error } = await supabase
                .from("asset_prices")
                .upsert(
                    {
                        symbol,
                        close_price: 1,
                        price_date: today,
                        cmc_rank: null,
                        volume_24h: null,
                        percent_change_24h: 0,
                        percent_change_1h: 0,
                        percent_change_7d: 0,
                        percent_change_30d: 0,
                    },
                    { onConflict: "symbol,price_date" }
                );

            if (error) {
                console.error(`Error upserting stable price for ${symbol}:`, error);
            } else {
                console.log(`Saved stable price for ${symbol}: $1.00`);
            }
        }

        if (binanceSymbols.length === 0) {
            console.log("No non-stable symbols to fetch from Binance.");
            return new Response(
                JSON.stringify({ success: true, prices }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Fetching Binance prices for: ${binanceSymbols.join(', ')}`);

        const binancePairs = binanceSymbols.map(symbol => `${symbol}USDT`);
        const fetchedSymbols = new Set<string>();
        const cmcUpdatedSymbols = new Set<string>();
        let binanceData: any[] = [];

        try {
            const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binancePairs))}`;
            const binanceResponse = await fetch(binanceUrl);

            if (!binanceResponse.ok) {
                const errorText = await binanceResponse.text();
                throw new Error(`Binance API error: ${binanceResponse.status} - ${errorText}`);
            }

            const responseData = await binanceResponse.json();
            if (Array.isArray(responseData)) {
                binanceData = responseData;
            } else {
                console.warn("Binance batch response was not an array, falling back to per-symbol fetch.");
            }
        } catch (error) {
            console.warn("Binance batch fetch failed, falling back to per-symbol requests.", error);
        }

        if (binanceData.length === 0) {
            for (const pair of binancePairs) {
                try {
                    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
                    const response = await fetch(url);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.warn(`Binance symbol error for ${pair}: ${response.status} - ${errorText}`);
                        continue;
                    }

                    const item = await response.json();
                    binanceData.push(item);
                } catch (symbolError) {
                    console.warn(`Binance symbol fetch failed for ${pair}`, symbolError);
                }

                await new Promise(resolve => setTimeout(resolve, 120));
            }
        }

        console.log(`Binance response received for ${Array.isArray(binanceData) ? binanceData.length : 0} symbols`);

        if (Array.isArray(binanceData)) {
            for (const item of binanceData) {
                // item.symbol is "BTCUSDT". We want "BTC".
                const symbol = item.symbol.replace("USDT", "");

                if (binanceSymbols.includes(symbol)) {
                    fetchedSymbols.add(symbol);
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

        const cmcApiKey = Deno.env.get("COINMARKETCAP_API_KEY") || Deno.env.get("CMC_api") || "331ccac7-4ea8-4cb8-9a9e-5334db08817b";

        if (cmcApiKey) {
            try {
                const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${uniqueSymbols.join(",")}&convert=USD`;
                const cmcResponse = await fetch(cmcUrl, {
                    headers: {
                        "X-CMC_PRO_API_KEY": cmcApiKey,
                        "Accept": "application/json",
                    },
                });

                if (!cmcResponse.ok) {
                    const errorText = await cmcResponse.text();
                    console.warn(`CMC API error: ${cmcResponse.status} - ${errorText}`);
                } else {
                    const cmcData = await cmcResponse.json();
                    const cmcMap = cmcData?.data || {};

                    for (const symbol of uniqueSymbols) {
                        if (stableSymbols.includes(symbol)) continue;

                        const coin = cmcMap[symbol];
                        const quote = coin?.quote?.USD;
                        if (!coin || !quote) continue;

                        cmcUpdatedSymbols.add(symbol);

                        const cmcPrice = typeof quote.price === "number"
                            ? quote.price
                            : quote.price ? parseFloat(quote.price) : null;

                        if (cmcPrice && !prices[symbol]) {
                            prices[symbol] = cmcPrice;
                        }

                        const closePrice = prices[symbol] ?? cmcPrice;
                        if (!closePrice) continue;

                        const payload: Record<string, number | string | null> = {
                            symbol,
                            close_price: closePrice,
                            price_date: today,
                            cmc_rank: coin.cmc_rank ?? coin.rank ?? null,
                            percent_change_1h: quote.percent_change_1h ?? null,
                            percent_change_7d: quote.percent_change_7d ?? null,
                            percent_change_30d: quote.percent_change_30d ?? null,
                        };

                        if (!fetchedSymbols.has(symbol)) {
                            payload.percent_change_24h = quote.percent_change_24h ?? null;
                            payload.volume_24h = quote.volume_24h ?? null;
                        }

                        const { error } = await supabase
                            .from("asset_prices")
                            .upsert(payload, { onConflict: "symbol,price_date" });

                        if (error) {
                            console.error(`Error updating CMC stats for ${symbol}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.warn("CMC fetch failed:", error);
            }
        }

        let missingSymbols = binanceSymbols.filter(symbol => !fetchedSymbols.has(symbol));
        if (cmcUpdatedSymbols.size > 0) {
            missingSymbols = missingSymbols.filter(symbol => !cmcUpdatedSymbols.has(symbol));
        }
        if (missingSymbols.length > 0) {
            console.warn(`Binance missing symbols: ${missingSymbols.join(", ")}`);
        }

        console.log(`Successfully processed ${Object.keys(prices).length} prices`);

        return new Response(
            JSON.stringify({ success: true, prices, missingSymbols }),
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
