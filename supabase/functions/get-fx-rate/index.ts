import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const COINMARKETCAP_API_KEY = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!COINMARKETCAP_API_KEY) {
      throw new Error('COINMARKETCAP_API_KEY is not configured');
    }

    console.log('Fetching USDT/EUR rate from CoinMarketCap...');

    // Get USDT price in EUR
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=USDT&convert=EUR',
      {
        headers: {
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CoinMarketCap API error:', response.status, errorText);
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('CoinMarketCap response:', JSON.stringify(data, null, 2));

    const usdtPrice = data.data?.USDT?.quote?.EUR?.price;
    if (!usdtPrice) {
      throw new Error('Could not extract USDT/EUR rate from response');
    }

    const rate = Number(usdtPrice);
    console.log(`USDT/EUR rate: ${rate}`);

    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('fx_rates')
      .insert({
        pair: 'USDT_EUR',
        rate: rate,
        as_of: now,
        source: 'coinmarketcap',
      });

    if (insertError) {
      // Handle duplicate key error (rate already exists for this timestamp)
      if (insertError.code === '23505') {
        console.log('Rate already exists for this timestamp, updating...');
        const { error: updateError } = await supabase
          .from('fx_rates')
          .update({ rate: rate })
          .eq('pair', 'USDT_EUR')
          .eq('as_of', now);
        
        if (updateError) {
          console.error('Error updating fx_rate:', updateError);
        }
      } else {
        console.error('Error inserting fx_rate:', insertError);
        throw insertError;
      }
    }

    console.log('FX rate stored successfully');

    return new Response(
      JSON.stringify({ success: true, rate, as_of: now }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in get-fx-rate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
