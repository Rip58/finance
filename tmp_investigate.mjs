import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
    const userId = '47e7d753-9552-464d-891b-0e47dab65bf7';

    const { data: accounts } = await supabase.from('bank_accounts').select('*').eq('user_id', userId);
    const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', userId);
    const { data: holdings } = await supabase.from('account_holdings').select('*').eq('user_id', userId);
    const { data: prices } = await supabase.from('asset_prices').select('*');
    const { data: fx } = await supabase.from('fx_rates').select('*').eq('pair', 'USDT_EUR').order('as_of', { ascending: false }).limit(1);
    const usdtRate = fx && fx.length > 0 ? Number(fx[0].rate) : 1;
    const { data: dcaP } = await supabase.from('dca_portfolios').select('*').eq('user_id', userId);
    const { data: dcaTxs } = await supabase.from('asset_transactions').select('*').eq('user_id', userId);

    let totalHoldingsValue = 0;
    for (const h of holdings) {
        const price = prices.find(p => p.symbol === h.symbol || p.symbol === h.symbol.toUpperCase());
        const pVal = price ? price.close_price : 0;
        totalHoldingsValue += h.quantity * pVal;
    }

    let dcaHoldings = {};
    for (const t of dcaTxs) {
        const s = t.symbol.toUpperCase();
        if (!dcaHoldings[s]) dcaHoldings[s] = 0;
        dcaHoldings[s] += t.side === 'buy' ? t.quantity : -t.quantity;
    }
    let dcaUsd = 0;
    for (const [sym, qty] of Object.entries(dcaHoldings)) {
        const price = prices.find(p => p.symbol === sym || p.symbol === sym.toUpperCase());
        const pVal = price ? price.close_price : 0;
        dcaUsd += qty * pVal;
    }

    console.log("Holdings USDT value:", totalHoldingsValue);
    console.log("Holdings EUR value:", totalHoldingsValue * usdtRate);
    console.log("DCA USDT:", dcaUsd);
    console.log("DCA EUR:", dcaUsd * usdtRate);

    for (const acc of accounts) {
        let b = acc.importe_inicial ? Number(acc.initial_balance || 0) : 0;
        for (const t of txs.filter(tx => tx.bank_account_id === acc.id)) {
            b += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
        }
        console.log(`${acc.name}: ${b} EUR`);
    }
}
run();
