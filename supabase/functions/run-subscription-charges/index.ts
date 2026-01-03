import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function addPeriod(date: Date, cadence: string): Date {
  const result = new Date(date);
  switch (cadence) {
    case 'weekly':
      result.setDate(result.getDate() + 7);
      break;
    case 'monthly':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'quarterly':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'yearly':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Processing subscription charges for ${todayStr}...`);

    // Get active subscriptions with next_charge_date <= today
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .lte('next_charge_date', todayStr);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to process`);

    const results: { processed: number; skipped: number; errors: number } = {
      processed: 0,
      skipped: 0,
      errors: 0,
    };

    for (const sub of subscriptions || []) {
      try {
        // Check if charge already exists for this date (idempotency)
        const { data: existingCharge } = await supabase
          .from('subscription_charges')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('charge_date', sub.next_charge_date)
          .maybeSingle();

        if (existingCharge) {
          console.log(`Charge already exists for subscription ${sub.id} on ${sub.next_charge_date}, skipping`);
          results.skipped++;
          
          // Still advance the next_charge_date
          let nextDate = new Date(sub.next_charge_date);
          while (nextDate <= today) {
            nextDate = addPeriod(nextDate, sub.cadence);
          }
          
          await supabase
            .from('subscriptions')
            .update({ next_charge_date: nextDate.toISOString().split('T')[0] })
            .eq('id', sub.id);
          
          continue;
        }

        // Create expense transaction
        const valueDate = new Date(sub.next_charge_date);
        valueDate.setHours(0, 0, 0, 0);

        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: sub.user_id,
            type: 'expense',
            amount: sub.amount,
            currency: sub.currency,
            category_id: sub.category_id,
            bank_account_id: sub.bank_account_id,
            description: `Suscripción: ${sub.name}`,
            date: new Date().toISOString(),
            value_date: valueDate.toISOString(),
          })
          .select('id')
          .single();

        if (transactionError) {
          console.error(`Error creating transaction for subscription ${sub.id}:`, transactionError);
          results.errors++;
          continue;
        }

        // Create charge record for idempotency
        const { error: chargeError } = await supabase
          .from('subscription_charges')
          .insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            charge_date: sub.next_charge_date,
            transaction_id: transaction.id,
          });

        if (chargeError) {
          console.error(`Error creating charge record for subscription ${sub.id}:`, chargeError);
          // Transaction was created, but charge record failed - this is a partial failure
          results.errors++;
          continue;
        }

        // Advance next_charge_date (handle missed periods)
        let nextDate = new Date(sub.next_charge_date);
        while (nextDate <= today) {
          nextDate = addPeriod(nextDate, sub.cadence);
        }

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ next_charge_date: nextDate.toISOString().split('T')[0] })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating next_charge_date for subscription ${sub.id}:`, updateError);
        }

        console.log(`Processed subscription ${sub.id}: ${sub.name}`);
        results.processed++;
      } catch (err) {
        console.error(`Error processing subscription ${sub.id}:`, err);
        results.errors++;
      }
    }

    console.log(`Processing complete: ${JSON.stringify(results)}`);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in run-subscription-charges:', error);
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
