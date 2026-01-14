import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccountHolding {
  symbol: string;
  quantity: number;
}

interface BankAccount {
  id: string;
  currency: string;
  category_id: string;
}

interface Transaction {
  amount: number;
  type: "income" | "expense";
  bank_account_id: string;
  currency: string;
}

interface FxRate {
  pair: string;
  rate: number;
}

interface Category {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id } = await req.json().catch(() => ({ user_id: undefined }));

    let targetUsers: { id: string }[] = [];

    if (user_id) {
      targetUsers = [{ id: user_id }];
    } else {
      // BATCH MODE (CRON): Update prices first, then snapshot all users
      console.log("Batch mode detected: Updating asset prices...");

      try {
        // 1. Get all unique symbols from holdings (as any due to typing)
        const { data: holdingsData } = await (supabase as any)
          .from("account_holdings")
          .select("symbol");

        if (holdingsData && holdingsData.length > 0) {
          const uniqueSymbols = [...new Set(holdingsData.map((h: any) => h.symbol))];
          const symbols = uniqueSymbols.filter(s => s && typeof s === 'string' && /^[A-Za-z0-9]{1,10}$/.test(s));

          if (symbols.length > 0) {
            const apiKey = Deno.env.get("COINMARKETCAP_API_KEY") || Deno.env.get("CMC_api") || "331ccac7-4ea8-4cb8-9a9e-5334db08817b";

            // Fetch from CoinMarketCap
            const cmcResponse = await fetch(
              `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(",")}&convert=USD`,
              {
                headers: {
                  "X-CMC_PRO_API_KEY": apiKey,
                  "Accept": "application/json",
                },
              }
            );

            if (cmcResponse.ok) {
              const cmcData = await cmcResponse.json();
              const today = new Date().toISOString().split("T")[0];

              const updates = [];
              for (const symbol of symbols) {
                const coinSymbol = (symbol as string).toUpperCase();
                const coinData = cmcData.data?.[coinSymbol];
                if (coinData?.quote?.USD?.price) {
                  updates.push({
                    symbol: coinSymbol,
                    close_price: coinData.quote.USD.price,
                    price_date: today
                  });
                }
              }

              if (updates.length > 0) {
                const { error: upsertError } = await supabase
                  .from("asset_prices")
                  .upsert(updates, { onConflict: "symbol,price_date" });

                if (upsertError) console.error("Error updating prices:", upsertError);
                else console.log(`Updated prices for ${updates.length} assets.`);
              }
            } else {
              const errText = await cmcResponse.text();
              console.error("CMC API Error:", errText);
            }
          }
        }
      } catch (err) {
        console.error("Error in batch price update:", err);
        // Continue to snapshots anyway
      }

      // Get all users (or filter active ones if possible, but for now simple)
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      targetUsers = users.users;
    }

    const results = [];

    // Fetch generic data once if possible, but prices and FX are global.
    // Fetch latest FX rate
    const { data: fxData } = await supabase
      .from("fx_rates")
      .select("rate")
      .eq("pair", "USDT_EUR")
      .order("as_of", { ascending: false })
      .limit(1)
      .single();

    const usdtEurRate = fxData?.rate || 1;

    // Fetch latest prices for all symbols? This might be too much. 
    // Let's fetch as needed or fetch all active symbols first.

    for (const user of targetUsers) {
      const userId = user.id;

      // 1. Fetch User Data
      const [
        { data: accounts },
        { data: holdings },
        { data: transactions },
        { data: categories }
      ] = await Promise.all([
        supabase.from("bank_accounts").select("id, currency, initial_balance, category_id").eq("user_id", userId).is("is_archived", false),
        supabase.from("account_holdings").select("symbol, quantity").eq("user_id", userId),
        supabase.from("transactions").select("amount, type, bank_account_id, currency").eq("user_id", userId),
        supabase.from("categories").select("id, name").eq("user_id", userId)
      ]);

      if (!accounts || !categories) continue;

      const userAccounts = (accounts || []) as any[];
      const userHoldings = (holdings || []) as AccountHolding[];
      const userTransactions = (transactions || []) as Transaction[];
      const userCategories = (categories || []) as Category[];

      // 2. Identify Categories
      const savingsCatIds = userCategories.filter(c => c.name.toLowerCase().includes("ahorros") || c.name.toLowerCase().includes("ahorro")).map(c => c.id);
      const investCatIds = userCategories.filter(c => c.name.toLowerCase().includes("inversión") || c.name.toLowerCase().includes("inversiones")).map(c => c.id);
      const cryptoCatIds = userCategories.filter(c => c.name.toLowerCase().includes("crypto") || c.name.toLowerCase().includes("cripto")).map(c => c.id);

      // 3. Calculate Account Balances
      const balances: Record<string, number> = {};

      // Init with initial_balance
      userAccounts.forEach(acc => {
        balances[acc.id] = Number(acc.initial_balance);
      });

      // Apply transactions
      userTransactions.forEach(tx => {
        if (balances[tx.bank_account_id] !== undefined) {
          if (tx.type === "income") balances[tx.bank_account_id] += Number(tx.amount);
          else balances[tx.bank_account_id] -= Number(tx.amount);
        }
      });

      // 4. Calculate Grouped Balances (Savings, Investments)
      let savingsEur = 0;
      let investmentsEur = 0;

      // Helper to convert to EUR
      const toEur = (amount: number, currency: string) => {
        if (currency === "USDT" || currency === "USD") return amount * usdtEurRate;
        // Assume EUR for others for now or 1:1
        return amount;
      };

      userAccounts.forEach(acc => {
        const bal = balances[acc.id] || 0;
        // Prioritize explicit investment categories
        if (investCatIds.includes(acc.category_id)) {
          investmentsEur += toEur(bal, acc.currency);
        } else {
          // Default everything else to Savings to ensures Total Balance is correct
          // This covers "Ahorros" and any unclassified or custom named category accounts
          savingsEur += toEur(bal, acc.currency);
        }
      });

      // 5. Calculate Crypto Value (Holdings)
      // We need prices for these holdings.
      const symbols = [...new Set(userHoldings.map(h => h.symbol))];
      let cryptoEur = 0;

      if (symbols.length > 0) {
        const { data: prices } = await supabase
          .from("asset_prices")
          .select("symbol, close_price")
          .in("symbol", symbols)
          .order("price_date", { ascending: false }); // this might return multiple rows per symbol, need latest.

        const latestPrices: Record<string, number> = {};
        if (prices) {
          prices.forEach((p: any) => {
            if (!latestPrices[p.symbol]) latestPrices[p.symbol] = p.close_price;
          });
        }

        userHoldings.forEach(h => {
          const price = latestPrices[h.symbol] || 0;
          cryptoEur += (h.quantity * price) * usdtEurRate;
        });
      }

      // 6. Insert Snapshot
      const totalBalance = savingsEur + investmentsEur + cryptoEur;

      const { error: insertError } = await supabase.from("balance_history").insert({
        user_id: userId,
        total_balance: totalBalance,
        savings_balance: savingsEur,
        investments_balance: investmentsEur,
        crypto_balance: cryptoEur,
        currency: "EUR"
      });

      if (insertError) {
        console.error(`Error saving snapshot for user ${userId}:`, insertError);
      } else {
        results.push({ userId, totalBalance });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in take-balance-snapshot:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
