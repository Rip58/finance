-- Enable pg_cron extension (requires project setting configured in Supabase Dashboard usually, but good to try)
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Schedule the job to run daily at 8:00 AM
-- Note: '0 8 * * *' is 8:00 AM UTC.
-- We use pg_net to invoke the Edge Function.
select
  cron.schedule(
    'daily-balance-snapshot',
    '0 8 * * *',
    $$
    select
      net.http_post(
        url:='https://larujqxlhtwbyalmzmbo.supabase.co/functions/v1/take-balance-snapshot',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
  );
