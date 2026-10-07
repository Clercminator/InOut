create schema if not exists inout_private;
revoke all on schema inout_private from public, anon, authenticated;
grant usage on schema inout_private to service_role;

create table inout_private.shares (
  id text primary key check (id ~ '^[a-f0-9]{32}$'),
  secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check (snapshot is null or octet_length(snapshot::text) <= 16000)
);
create index inout_shares_expiry on inout_private.shares(expires_at);
alter table inout_private.shares enable row level security;
create table inout_private.share_limits (bucket timestamptz primary key, used integer not null);
alter table inout_private.share_limits enable row level security;
revoke all on all tables in schema inout_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema inout_private to service_role;

-- Only the Edge Function's server credential can execute these invoker functions.
-- Public clients cannot enumerate links, read management hashes, or access tables.
create function public.inout_create_share(p_id text, p_secret_hash text, p_created_at timestamptz, p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare existing inout_private.shares; used_count integer;
begin
  perform pg_advisory_xact_lock(91029301);
  select * into existing from inout_private.shares where id = p_id;
  if found then
    if existing.secret_hash <> p_secret_hash or existing.snapshot is null or existing.expires_at <= now() then
      return jsonb_build_object('status', 410);
    end if;
    return jsonb_build_object('status', 200, 'expiresAt', existing.expires_at);
  end if;
  if p_created_at < now() - interval '10 minutes' or p_created_at > now() + interval '1 minute' then
    return jsonb_build_object('status', 400);
  end if;
  delete from inout_private.shares where expires_at <= now();
  delete from inout_private.share_limits where bucket < date_trunc('hour', now()) - interval '1 hour';
  insert into inout_private.share_limits(bucket, used) values (date_trunc('hour', now()), 1)
    on conflict (bucket) do update set used = least(inout_private.share_limits.used + 1, 201)
    returning used into used_count;
  if used_count > 200 or (select count(*) from inout_private.shares) >= 10000 then
    return jsonb_build_object('status', 429);
  end if;
  insert into inout_private.shares(id, secret_hash, snapshot, created_at, expires_at)
    values(p_id, p_secret_hash, p_snapshot, p_created_at, p_created_at + interval '30 days');
  return jsonb_build_object('status', 201, 'expiresAt', p_created_at + interval '30 days');
end $$;

create function public.inout_resolve_share(p_id text)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('snapshot', snapshot, 'expiresAt', expires_at)
  from inout_private.shares where id = p_id and snapshot is not null and expires_at > now();
$$;

create function public.inout_revoke_share(p_id text, p_secret_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update inout_private.shares set snapshot = null where id = p_id and secret_hash = p_secret_hash;
  return found;
end $$;

revoke all on function public.inout_create_share(text,text,timestamptz,jsonb) from public, anon, authenticated;
revoke all on function public.inout_resolve_share(text) from public, anon, authenticated;
revoke all on function public.inout_revoke_share(text,text) from public, anon, authenticated;
grant execute on function public.inout_create_share(text,text,timestamptz,jsonb) to service_role;
grant execute on function public.inout_resolve_share(text) to service_role;
grant execute on function public.inout_revoke_share(text,text) to service_role;
