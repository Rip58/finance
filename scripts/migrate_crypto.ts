import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCryptoCategories() {
    console.log('Fetching categories...');
    const { data: categories, error: catError } = await supabase.from('categories').select('*');
    if (catError) { console.error('Error fetching categories:', catError); return; }

    let cryptoCategory = categories.find((c: any) => c.name.toLowerCase() === 'crypto' || c.name.toLowerCase() === 'cripto');

    if (!cryptoCategory) {
        console.log('Crypto category not found. Creating it...');
        // Create it for the first user we find
        const defaultUserId = categories.length > 0 ? categories[0].user_id : null;
        if (!defaultUserId) { console.error('Error: No existing categories to copy user_id from.'); return; }

        const { data: newCat, error: insertError } = await supabase.from('categories').insert({
            user_id: defaultUserId,
            name: 'Crypto',
            scope: 'account',
            sort_order: categories.length
        }).select().single();

        if (insertError) { console.error('Error inserting category:', insertError); return; }
        cryptoCategory = newCat;
    }

    console.log('Crypto category ID:', cryptoCategory.id);

    console.log('Fetching accounts...');
    const { data: accounts, error: accError } = await supabase.from('bank_accounts').select('*');
    if (accError) { console.error('Error fetching accounts:', accError); return; }

    const investmentCatIds = categories.filter((c: any) => c.name.toLowerCase().includes('inver')).map((c: any) => c.id);

    const accountsToUpdate = accounts.filter((acc: any) => {
        // If it's currently in an investment category, but the currency is Crypto-ish
        if (investmentCatIds.includes(acc.category_id)) {
            if (acc.currency === 'USDT' || acc.currency === 'USD' || acc.currency === 'BTC' || acc.currency === 'ETH') {
                return true;
            }
            if (acc.name.toLowerCase().includes('binance') || acc.name.toLowerCase().includes('kraken') || acc.name.toLowerCase().includes('coinbase')) {
                return true;
            }
        }
        // Alternatively, if it has no category, but currency is crypto
        if (!acc.category_id && (acc.currency === 'USDT' || acc.currency === 'BTC')) {
            return true;
        }
        return false;
    });

    if (accountsToUpdate.length === 0) {
        console.log('No accounts need migrating.');
        return;
    }

    console.log(`Updating ${accountsToUpdate.length} accounts to Crypto category...`);
    for (const acc of accountsToUpdate) {
        const { error } = await supabase.from('bank_accounts').update({ category_id: cryptoCategory.id }).eq('id', acc.id);
        if (error) {
            console.error(`Error updating account ${acc.name}:`, error);
        } else {
            console.log(`Updated: ${acc.name}`);
        }
    }
    console.log('Migration complete!');
}

migrateCryptoCategories();
