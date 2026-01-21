-- Create a function to get interpolated balance history for charts
create or replace function public.get_balance_evolution(
  p_time_range text,
  p_user_id uuid default auth.uid()
)
returns table (
  event_time timestamptz,
  total_balance numeric,
  crypto_balance numeric,
  fiat_balance numeric -- savings + investments
)
language plpgsql
security definer
as $$
declare
  v_start_date timestamptz;
  v_interval interval;
begin
  -- Determine start date and interval based on range
  case p_time_range
    when '1D' then
      v_start_date := now() - interval '24 hours';
      v_interval := interval '5 minutes';
    when '7D' then
      v_start_date := now() - interval '7 days';
      v_interval := interval '1 hour';
    when '30D' then
      v_start_date := now() - interval '30 days';
      v_interval := interval '6 hours';
    when '90D' then
      v_start_date := now() - interval '90 days';
      v_interval := interval '12 hours';
    when '1Y' then
      v_start_date := now() - interval '1 year';
      v_interval := interval '1 day';
    when 'ALL' then
      select min(date) into v_start_date from public.balance_history where user_id = p_user_id;
      if v_start_date is null then v_start_date := now() - interval '1 day'; end if;
      v_interval := interval '1 day';
    else
      -- Default to 1D
      v_start_date := now() - interval '24 hours';
      v_interval := interval '15 minutes';
  end case;

  return query
  with time_series as (
    select generate_series(
      date_trunc('minute', v_start_date),
      date_trunc('minute', now()),
      v_interval
    ) as series_time
  )
  select
    ts.series_time as event_time,
    coalesce(bh.total_balance, 0)::numeric as total_balance,
    coalesce(bh.crypto_balance, 0)::numeric as crypto_balance,
    coalesce((bh.savings_balance + bh.investments_balance), 0)::numeric as fiat_balance
  from time_series ts
  left join lateral (
    -- Get the last known balance state at or before the series time (LOCF)
    select 
      bh_inner.total_balance,
      bh_inner.crypto_balance,
      bh_inner.savings_balance,
      bh_inner.investments_balance
    from public.balance_history bh_inner
    where bh_inner.user_id = p_user_id
      and bh_inner.date <= ts.series_time
    order by bh_inner.date desc
    limit 1
  ) bh on true
  order by ts.series_time;
end;
$$;
