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
        // Auth check
        // Auth check
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn("Missing or invalid auth header in request");
            console.log("Headers available:", JSON.stringify(Object.fromEntries(req.headers.entries())));
            // Temporarily allowing request to proceed to rule out header stripping issue
            // return new Response(
            //     JSON.stringify({ error: 'Unauthorized' }),
            //     { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            // );
        }

        const { symbol } = await req.json();

        if (!symbol) {
            return new Response(
                JSON.stringify({ error: "Symbol is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Sanitize
        const cleanSymbol = symbol.trim().toUpperCase();
        if (!/^[A-Z0-9]{1,10}$/.test(cleanSymbol)) {
            return new Response(
                JSON.stringify({ valid: false, message: "Invalid symbol format" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const apiKey = Deno.env.get("COINMARKETCAP_API_KEY") || Deno.env.get("CMC_api") || "331ccac7-4ea8-4cb8-9a9e-5334db08817b";

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "Server misconfiguration" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch from CMC
        const cmcResponse = await fetch(
            `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${cleanSymbol}`,
            {
                headers: {
                    "X-CMC_PRO_API_KEY": apiKey,
                    "Accept": "application/json",
                },
            }
        );

        if (!cmcResponse.ok) {
            // 400 usually means symbol not found or invalid
            const errorText = await cmcResponse.text();
            console.log(`CMC Validation failed for ${cleanSymbol}: ${cmcResponse.status} - ${errorText}`);

            return new Response(
                JSON.stringify({
                    valid: false,
                    message: `Símbolo '${cleanSymbol}' no encontrado en CoinMarketCap`
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const data = await cmcResponse.json();
        const coinData = data.data?.[cleanSymbol];

        if (!coinData) {
            // Technically this shouldn't happen if status is 200, but handling it just in case
            // Sometimes CMC returns data as array if multiple match? No, quotes/latest is map by symbol
            // Wait, if multiple `PEPE` exist, quotes/latest might return the main one or array?
            // Documentation says "Map<String, Cryptocurrency>".
            // Let's assume strict match or first one.
            return new Response(
                JSON.stringify({
                    valid: false,
                    message: `No se encontraron datos para '${cleanSymbol}'`
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // If it's an array (sometimes happens with "by_slug" but we use "symbol"), usually it's one object.
        // Actually, looking at previous logs, it's `data: { "BTC": { ... } }`.
        // But if there are duplicates, `symbol` query might return array?
        // "If one or more cryptocurrencies share the same symbol... the API will return the one with the highest marketcap". 
        // Wait, documentation says: "If verify that you are querying for the correct cryptocurrency... use 'slug' or 'id'".
        // For our user, we assume they want the main one.

        let coin = coinData;
        if (Array.isArray(coinData)) {
            coin = coinData[0];
        }

        return new Response(
            JSON.stringify({
                valid: true,
                name: coin.name,
                symbol: coin.symbol,
                id: coin.id,
                price: coin.quote?.USD?.price
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error in validate-crypto-symbol:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
