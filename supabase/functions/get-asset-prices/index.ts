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
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "symbols array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("COINMARKETCAP_API_KEY");
    if (!apiKey) {
      console.error("COINMARKETCAP_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching prices for symbols: ${symbols.join(", ")}`);

    // Fetch prices from CoinMarketCap
    const cmcResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}&convert=EUR`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!cmcResponse.ok) {
      const errorText = await cmcResponse.text();
      console.error(`CMC API error: ${cmcResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch prices from CoinMarketCap" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cmcData = await cmcResponse.json();
    console.log("CMC response received:", JSON.stringify(cmcData.status));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const prices: Record<string, number> = {};

    // Process and store prices
    for (const symbol of symbols) {
      const coinData = cmcData.data?.[symbol.toUpperCase()];
      if (coinData?.quote?.EUR?.price) {
        const price = coinData.quote.EUR.price;
        prices[symbol.toUpperCase()] = price;

        // Upsert to asset_prices table
        const { error } = await supabase
          .from("asset_prices")
          .upsert(
            {
              symbol: symbol.toUpperCase(),
              close_price: price,
              price_date: today,
            },
            { onConflict: "symbol,price_date" }
          );

        if (error) {
          console.error(`Error upserting price for ${symbol}:`, error);
        } else {
          console.log(`Stored price for ${symbol}: ${price} EUR`);
        }
      } else {
        console.warn(`No price data found for symbol: ${symbol}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, prices }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-asset-prices:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
