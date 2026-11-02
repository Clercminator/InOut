create schema if not exists inout_private;
revoke all on schema inout_private from public, anon, authenticated;
grant usage on schema inout_private to service_role;

create table inout_private.founder_campaigns (
  environment text primary key check (environment in ('production','sandbox')),
  status text not null default 'inactive' check (status in ('inactive','active','paused','sold_out','closed')),
  allocation integer not null default 1000 check (allocation = 1000),
  safety_buffer integer not null default 10 check (safety_buffer between 1 and 100),
  ready boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into inout_private.founder_campaigns(environment) values ('production'),('sandbox');
create table inout_private.founder_reservations (
  environment text not null references inout_private.founder_campaigns,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  customer_id text not null,
  platform text not null check (platform in ('android','ios')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  state text not null default 'reserved' check (state in ('reserved','released','confirmed')),
  primary key(environment, token_hash)
);
create index founder_reservations_customer on inout_private.founder_reservations(environment,customer_id);
create index founder_reservations_expiry on inout_private.founder_reservations(environment,state,expires_at);
create table inout_private.founder_purchases (
  environment text not null references inout_private.founder_campaigns,
  store text not null check (store in ('APP_STORE','PLAY_STORE')),
  transaction_id text not null,
  product_id text not null,
  customer_id text not null,
  purchased_at timestamptz not null,
  received_at timestamptz not null default now(),
  state text not null check (state in ('purchased','refunded','revoked')),
  allocated boolean not null,
  event_at timestamptz not null,
  event_id text not null,
  primary key(environment,store,transaction_id)
);
create index founder_purchases_lookup on inout_private.founder_purchases(environment,store,product_id,purchased_at);
create table inout_private.founder_limits (bucket timestamptz not null, key text not null, used integer not null, primary key(bucket,key));
alter table inout_private.founder_campaigns enable row level security;
alter table inout_private.founder_reservations enable row level security;
alter table inout_private.founder_purchases enable row level security;
alter table inout_private.founder_limits enable row level security;
revoke all on inout_private.founder_campaigns, inout_private.founder_reservations, inout_private.founder_purchases, inout_private.founder_limits from public, anon, authenticated;
grant select,insert,update,delete on inout_private.founder_campaigns, inout_private.founder_reservations, inout_private.founder_purchases, inout_private.founder_limits to service_role;

-- Only the Edge Function and an authenticated operator can execute this dispatcher.
-- All inventory mutations lock the same environment row; stores share one pool.
create function public.inout_founders(p_action text, p_data jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  env text := p_data->>'environment';
  c inout_private.founder_campaigns%rowtype;
  r inout_private.founder_reservations%rowtype;
  bought integer; held integer; n integer; k text;
  found boolean; new_purchase boolean := false;
begin
  if p_action = 'rate' then
    perform pg_advisory_xact_lock(91029304);
    delete from inout_private.founder_limits where bucket < date_trunc('hour',now());
    foreach k in array array['global', 'ip:' || (p_data->>'ip'), 'customer:' || (p_data->>'customer')] loop
      insert into inout_private.founder_limits values(date_trunc('hour',now()), k, 1)
      on conflict(bucket,key) do update set used = least(inout_private.founder_limits.used+1,10001) returning used into n;
      if n > (case when k='global' then 10000 when k like 'ip:%' then 300 else 90 end) then return 'false'::jsonb; end if;
    end loop;
    return 'true'::jsonb;
  end if;
  select * into c from inout_private.founder_campaigns where environment=env for update;
  if c.environment is null then raise exception 'Invalid environment'; end if;
  select count(*) into bought from inout_private.founder_purchases where environment=env;
  select count(*) into held from inout_private.founder_reservations where environment=env and state='reserved' and expires_at>now();

  if p_action = 'control' then
    if p_data ? 'status' then
      if c.status='closed' and p_data->>'status'<>'closed' then raise exception 'Closed is permanent'; end if;
      if p_data->>'status'='active' and (not coalesce((p_data->>'ready')::boolean,c.ready) or bought>=c.allocation-c.safety_buffer) then raise exception 'Campaign not ready or safety buffer reached'; end if;
      update inout_private.founder_campaigns set status=p_data->>'status', ready=coalesce((p_data->>'ready')::boolean,ready),updated_at=now() where environment=env returning * into c;
    end if;
  elsif p_action = 'reserve' then
    if not c.ready or c.status<>'active' then return jsonb_build_object('allowed',false,'status',c.status); end if;
    if exists(select 1 from inout_private.founder_purchases where environment=env and customer_id=p_data->>'customerId') then return jsonb_build_object('allowed',false,'status','owned'); end if;
    select * into r from inout_private.founder_reservations where environment=env and customer_id=p_data->>'customerId' and state='reserved' and expires_at>now() order by created_at limit 1;
    if r.token_hash is not null then
      return jsonb_build_object('allowed',r.token_hash=p_data->>'tokenHash','expiresAt',r.expires_at,'status','reserved');
    end if;
    if bought+held>=c.allocation-c.safety_buffer then return jsonb_build_object('allowed',false,'status',c.status); end if;
    -- Never extend an old capability after an ambiguous checkout.
    if exists(select 1 from inout_private.founder_reservations where environment=env and token_hash=p_data->>'tokenHash') then return jsonb_build_object('allowed',false,'status','expired'); end if;
    insert into inout_private.founder_reservations(environment,token_hash,customer_id,platform)
      values(env,p_data->>'tokenHash',p_data->>'customerId',p_data->>'platform') returning * into r;
    return jsonb_build_object('allowed',true,'expiresAt',r.expires_at,'status','reserved');
  elsif p_action = 'cancel' then
    update inout_private.founder_reservations set state='released'
      where environment=env and token_hash=p_data->>'tokenHash' and customer_id=p_data->>'customerId' and state='reserved';
    return '{}'::jsonb;
  elsif p_action = 'event' then
    if p_data->>'productId' not in ('inout_pro_lifetime','com.imrtech.inout.pro.lifetime') then raise exception 'Invalid product'; end if;
    insert into inout_private.founder_purchases(environment,store,transaction_id,product_id,customer_id,purchased_at,state,allocated,event_at,event_id)
      values(env,p_data->>'store',p_data->>'transactionId',p_data->>'productId',p_data->>'customerId',(p_data->>'purchasedAt')::timestamptz,p_data->>'state',bought<c.allocation,(p_data->>'eventAt')::timestamptz,p_data->>'eventId')
      on conflict do nothing;
    get diagnostics n = row_count;
    new_purchase := n=1;
    if not new_purchase then
      update inout_private.founder_purchases set state=p_data->>'state', event_at=(p_data->>'eventAt')::timestamptz,event_id=p_data->>'eventId'
        where environment=env and store=p_data->>'store' and transaction_id=p_data->>'transactionId' and event_at<(p_data->>'eventAt')::timestamptz;
    end if;
    -- Restore/aliases may change the customer. Match only known RevenueCat aliases.
    update inout_private.founder_reservations set state='confirmed'
      where environment=env and state='reserved' and (customer_id=p_data->>'customerId' or customer_id in (select jsonb_array_elements_text(coalesce(p_data->'aliases','[]'::jsonb))));
    select count(*) into bought from inout_private.founder_purchases where environment=env;
    if bought>=c.allocation-c.safety_buffer and c.status<>'closed' then
      update inout_private.founder_campaigns set status=case when bought>=c.allocation then 'sold_out' else 'paused' end,updated_at=now() where environment=env returning * into c;
    end if;
    return jsonb_build_object('recorded',true,'newPurchase',new_purchase);
  elsif p_action = 'lookup' then
    -- Called only with server-fetched RC purchase tuples, never client purchase claims.
    select exists(select 1 from inout_private.founder_purchases p
      join jsonb_to_recordset(p_data->'purchases') as v(store text,"transactionId" text)
      on p.store=v.store and p.transaction_id=v."transactionId"
      where p.environment=env and p.state='purchased' and p.allocated) into found;
    return jsonb_build_object('founder',found);
  elsif p_action <> 'status' then raise exception 'Invalid action';
  end if;
  return jsonb_build_object('status',c.status,'ready',c.ready,'allocation',c.allocation,'confirmed',bought,'reservations',held,
    'available',greatest(0,c.allocation-c.safety_buffer-bought-held),'safetyBuffer',c.safety_buffer,
    'allowed',c.ready and c.status='active' and bought+held<c.allocation-c.safety_buffer);
end $$;
revoke all on function public.inout_founders(text,jsonb) from public,anon,authenticated;
grant execute on function public.inout_founders(text,jsonb) to service_role;
