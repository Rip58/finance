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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: "symbols array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate symbols - only allow alphanumeric and limit count
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

    const apiKey = Deno.env.get("COINMARKETCAP_API_KEY");
    if (!apiKey) {
      console.error("COINMARKETCAP_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching prices for symbols: ${sanitizedSymbols.join(", ")}`);

    // Fetch prices from CoinMarketCap in USD
    const cmcResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${sanitizedSymbols.join(",")}&convert=USD`,
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
    console.log("CMC response received");

    // Initialize Supabase client with service role for database writes
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const prices: Record<string, number> = {};

    // Process and store prices
    for (const symbol of sanitizedSymbols) {
      const coinData = cmcData.data?.[symbol];
      if (coinData?.quote?.USD?.price) {
        const price = coinData.quote.USD.price;
        prices[symbol] = price;

        // Upsert to asset_prices table
        const { error } = await supabase
          .from("asset_prices")
          .upsert(
            {
              symbol: symbol,
              close_price: price,
              price_date: today,
            },
            { onConflict: "symbol,price_date" }
          );

        if (error) {
          console.error(`Error upserting price for ${symbol}:`, error);
        } else {
          console.log(`Stored price for ${symbol}: ${price} USD`);
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
