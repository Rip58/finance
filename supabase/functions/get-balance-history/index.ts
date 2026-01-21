
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"

// Utilities
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

interface RequestBody {
    range: "1D" | "7D" | "1M" | "3M" | "1Y";
    user_id?: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const reqData: RequestBody = await req.json();
        // Use user_id from auth if not provided in body (security best practice)
        // For now we trust the client or checking auth header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Auth Header');

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error('Invalid User');

        const userId = user.id;
        const range = reqData.range || "1M";

        // 1. Define Time Grid & Start Time
        const now = Date.now();
        let startTime = now;
        let intervalMs = ONE_DAY;

        switch (range) {
            case "1D": startTime = now - ONE_DAY; intervalMs = 5 * ONE_MINUTE; break;
            case "7D": startTime = now - (7 * ONE_DAY); intervalMs = ONE_HOUR; break;
            case "1M": startTime = now - (30 * ONE_DAY); intervalMs = 4 * ONE_HOUR; break;
            case "3M": startTime = now - (90 * ONE_DAY); intervalMs = 12 * ONE_HOUR; break; // User asked for 3M
            case "1Y": startTime = now - (365 * ONE_DAY); intervalMs = 24 * ONE_HOUR; break;
        }

        // Generate Grid
        const timeGrid: number[] = [];
        for (let t = startTime; t <= now; t += intervalMs) {
            timeGrid.push(t);
        }
        // Ensure "now" is included
        if (timeGrid[timeGrid.length - 1] < now) timeGrid.push(now);

        // 2. Fetch Data (Parallel)
        const [eventsRes, assetsRes, pricesRes] = await Promise.all([
            // A. Account Events (Fiat)
            supabaseClient
                .from('account_events')
                .select('*')
                .eq('user_id', userId)
                .order('occurred_at', { ascending: true }),

            // B. Asset Transactions (Crypto Holdings)
            supabaseClient
                .from('asset_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('transaction_date', { ascending: true }),

            // C. Get cached prices (Assuming we have some, simple fetch for now)
            // Implementation Note: In a real robust system, we would query 'asset_prices' 
            // for the specific range. For MVP, we might just look up close prices matching timestamps.
            // Optimisation: Just get ALL prices for relevant symbols in range? Can be heavy.
            // Let's rely on valid 'asset_prices' table data.
            supabaseClient
                .from('asset_prices')
                .select('*')
                .gte('price_date', new Date(startTime).toISOString())
                .order('price_date', { ascending: true })
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (assetsRes.error) throw assetsRes.error;

        // Process Data
        const accountEvents = eventsRes.data || [];
        const assetTx = assetsRes.data || [];
        const rawPrices = pricesRes.data || [];

        // Organize Prices: Map<Symbol, Array<{time, price}>>
        const priceMap = new Map<string, { time: number, price: number }[]>();
        rawPrices.forEach(p => {
            const sym = p.symbol.toUpperCase();
            if (!priceMap.has(sym)) priceMap.set(sym, []);
            priceMap.get(sym)?.push({ time: new Date(p.price_date).getTime(), price: p.close_price });
        });

        // Helper to get price at time T (Simple search, assuming sorted)
        const getPriceAt = (symbol: string, time: number): number => {
            const history = priceMap.get(symbol);
            if (!history || history.length === 0) return 0;

            // Find last price before or at 'time'
            // Naive linear search is fine for small history, binary search better for large
            let lastPrice = 0;
            for (const p of history) {
                if (p.time > time) break;
                lastPrice = p.price;
            }
            // Fallback: If no price before T, use first available (if T is very old) or 0
            return lastPrice || history[0].price;
        };

        // 3. Reconstruction Loop
        const resultPoints = [];

        // Initial State Trackers
        const accountBalances = new Map<string, number>(); // account_id -> balance
        const assetHoldings = new Map<string, number>(); // symbol -> quantity

        // Pointers for events (optimization to not filter full array every loop)
        let eventIdx = 0;
        let txIdx = 0;

        for (const t of timeGrid) {
            const dateT = new Date(t);

            // A. Apply Account Events up to T
            while (eventIdx < accountEvents.length) {
                const ev = accountEvents[eventIdx];
                if (new Date(ev.occurred_at).getTime() > t) break; // Future event relative to T

                // Update Balance
                // We trust 'balance_after' as the source of truth for that moment
                accountBalances.set(ev.account_id, Number(ev.balance_after));
                eventIdx++;
            }

            // B. Apply Asset Transactions up to T
            while (txIdx < assetTx.length) {
                const tx = assetTx[txIdx];
                if (new Date(tx.transaction_date).getTime() > t) break;

                const sym = tx.symbol.toUpperCase();
                const currentQty = assetHoldings.get(sym) || 0;
                const delta = tx.side === 'buy' ? Number(tx.quantity) : -Number(tx.quantity);
                assetHoldings.set(sym, currentQty + delta);
                txIdx++;
            }

            // C. Calculate Total Value at T
            let totalEur = 0;

            // 1. Fiat Accounts
            for (const bal of accountBalances.values()) {
                totalEur += bal;
            }

            // 2. Crypto Assets
            // Assumption: Prices in DB are usually USD. We need a stable EUR/USD rate or history.
            // MVP: Use a fixed rate or extract from a specific "USDT_EUR" symbol if stored.
            const usdtEurRate = 0.96; // TODO: Fetch real historical FX

            let cryptoEth = 0;
            for (const [sym, qty] of assetHoldings.entries()) {
                if (qty <= 0) continue;
                // Get price
                const price = getPriceAt(sym, t);
                cryptoEth += (qty * price);
            }

            // Convert Crypto USD to EUR (assuming prices are USD)
            totalEur += (cryptoEth * usdtEurRate);

            resultPoints.push({
                time: t,
                value: totalEur
            });
        }

        return new Response(
            JSON.stringify({ data: resultPoints }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
