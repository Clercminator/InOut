create schema if not exists inout_private;
grant usage on schema inout_private to service_role;
create table inout_private.welcome_delivery (
  email_hash text primary key check (email_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb, status text not null default 'sending' check (status in ('sending','sent','retry','review')),
  first_attempt timestamptz not null default now(), last_attempt timestamptz not null default now(),
  attempts integer not null default 1, lease uuid not null, provider_id text
);
create table inout_private.welcome_limits (bucket date, key text, used integer not null, primary key(bucket,key));
create table inout_private.guided_allowance (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, session_id uuid not null, primary key(user_id, month, session_id)
);
alter table inout_private.welcome_delivery enable row level security;
alter table inout_private.welcome_limits enable row level security;
alter table inout_private.guided_allowance enable row level security;
revoke all on inout_private.welcome_delivery, inout_private.welcome_limits, inout_private.guided_allowance from public, anon, authenticated;
grant select, insert, update, delete on inout_private.welcome_delivery, inout_private.welcome_limits, inout_private.guided_allowance to service_role;
create policy deny_clients on inout_private.welcome_delivery to anon, authenticated using (false) with check (false);
create policy deny_clients on inout_private.welcome_limits to anon, authenticated using (false) with check (false);
create policy deny_clients on inout_private.guided_allowance to anon, authenticated using (false) with check (false);

create function public.inout_welcome_claim(p_hash text, p_device text, p_network text, p_payload jsonb, p_lease uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare row inout_private.welcome_delivery; amount integer; bucket_key text;
begin
  if p_hash !~ '^[a-f0-9]{64}$' or p_device !~ '^[a-f0-9]{64}$' or p_network !~ '^[a-f0-9]{64}$' or octet_length(p_payload::text) > 12000 then raise exception 'Invalid request'; end if;
  perform pg_advisory_xact_lock(91029303);
  delete from inout_private.welcome_limits where bucket < (now() at time zone 'UTC')::date;
  -- Keep only deduplication receipts after the safe retry window, never stale email bodies.
  update inout_private.welcome_delivery set status = 'review', payload = null where status in ('sending','retry') and first_attempt < now() - interval '23 hours';
  select * into row from inout_private.welcome_delivery where email_hash = p_hash for update;
  if found then
    if row.status in ('sent','review') then return jsonb_build_object('status',row.status); end if;
    if row.last_attempt > now() - interval '2 minutes' then return jsonb_build_object('status','busy'); end if;
    if row.attempts >= 6 then update inout_private.welcome_delivery set status='review',payload=null where email_hash=p_hash; return jsonb_build_object('status','review'); end if;
  end if;
  foreach bucket_key in array array['global', 'device:' || p_device, 'network:' || p_network] loop
    insert into inout_private.welcome_limits values((now() at time zone 'UTC')::date,bucket_key,1)
      on conflict(bucket,key) do update set used=least(inout_private.welcome_limits.used+1,501) returning used into amount;
    if amount > (case when bucket_key='global' then 500 when bucket_key like 'network:%' then 20 else 3 end) then return jsonb_build_object('status','limited'); end if;
  end loop;
  insert into inout_private.welcome_delivery(email_hash,payload,lease) values(p_hash,p_payload,p_lease)
    on conflict(email_hash) do update set status='sending',last_attempt=now(),attempts=inout_private.welcome_delivery.attempts+1,lease=p_lease
    returning * into row;
  return jsonb_build_object('status','claimed','payload',row.payload);
end $$;
create function public.inout_welcome_finish(p_hash text,p_lease uuid,p_sent boolean,p_provider text)
returns void language sql security invoker set search_path = '' as $$
  update inout_private.welcome_delivery set status=case when p_sent then 'sent' else 'retry' end,
    provider_id=case when p_sent then left(p_provider,160) else null end,
    payload=case when p_sent then null else payload end where email_hash=p_hash and lease=p_lease and status='sending';
$$;
-- Only the authenticated server adapter may choose a limit or user identity. Clients have no direct table/RPC access.
create function public.inout_guided_allowance(p_user uuid,p_session uuid,p_limit integer,p_consume boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare used_count integer; period date := date_trunc('month',now() at time zone 'UTC')::date; allowed boolean;
begin
  if p_user is null or p_session is null or p_limit < 0 or p_limit > 10000 then raise exception 'Invalid allowance'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 42));
  select count(*) into used_count from inout_private.guided_allowance where user_id=p_user and month=period;
  allowed := used_count < p_limit or exists(select 1 from inout_private.guided_allowance where user_id=p_user and month=period and session_id=p_session);
  if allowed and p_consume then
    insert into inout_private.guided_allowance values(p_user,period,p_session) on conflict do nothing;
    select count(*) into used_count from inout_private.guided_allowance where user_id=p_user and month=period;
  end if;
  return jsonb_build_object('allowed',allowed,'remaining',greatest(0,p_limit-used_count),'month',to_char(period,'YYYY-MM'));
end $$;
revoke all on function public.inout_welcome_claim(text,text,text,jsonb,uuid), public.inout_welcome_finish(text,uuid,boolean,text), public.inout_guided_allowance(uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.inout_welcome_claim(text,text,text,jsonb,uuid), public.inout_welcome_finish(text,uuid,boolean,text), public.inout_guided_allowance(uuid,uuid,integer,boolean) to service_role;
