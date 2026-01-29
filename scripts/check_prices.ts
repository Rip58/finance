
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Use Anon key for reading

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrices() {
    console.log("Checking latest prices for SPY and TSLA...");
    const { data, error } = await supabase
        .from('asset_prices')
        .select('*')
        .in('symbol', ['SPY', 'TSLA'])
        .order('price_date', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching prices:", error);
    } else {
        console.log("Found rows:", data);
    }
}

checkPrices();
