create schema if not exists inout_private;
revoke all on schema inout_private from public, anon, authenticated;
grant usage on schema inout_private to service_role;
create table inout_private.reviewer_grants (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  installation_hash text not null check (installation_hash ~ '^[a-f0-9]{64}$'),
  generation text not null,
  expires_at timestamptz not null,
  revoked boolean not null default false
);
create index reviewer_grants_expiry on inout_private.reviewer_grants(expires_at);
create table inout_private.reviewer_limits (bucket timestamptz, key text, used integer not null, primary key(bucket, key));
alter table inout_private.reviewer_grants enable row level security;
alter table inout_private.reviewer_limits enable row level security;
create policy deny_clients on inout_private.reviewer_grants to anon, authenticated using (false) with check (false);
create policy deny_clients on inout_private.reviewer_limits to anon, authenticated using (false) with check (false);
revoke all on inout_private.reviewer_grants, inout_private.reviewer_limits from public, anon, authenticated;
grant select, insert, update, delete on inout_private.reviewer_grants, inout_private.reviewer_limits to service_role;

create function public.inout_reviewer_rate(p_installation text, p_action text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare global_used integer; device_used integer; cap integer;
begin
  if p_action not in ('redeem', 'validate') or p_installation !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(91029302);
  cap := case when p_action = 'redeem' then 300 else 3000 end;
  delete from inout_private.reviewer_limits where bucket < date_trunc('hour', now());
  delete from inout_private.reviewer_grants where expires_at <= now();
  insert into inout_private.reviewer_limits values(date_trunc('hour', now()), p_action, 1)
    on conflict(bucket, key) do update set used = least(inout_private.reviewer_limits.used + 1, cap + 1) returning used into global_used;
  if global_used > cap then return false; end if;
  insert into inout_private.reviewer_limits values(date_trunc('hour', now()), p_action || ':' || p_installation, 1)
    on conflict(bucket, key) do update set used = least(inout_private.reviewer_limits.used + 1, 61) returning used into device_used;
  return device_used <= case when p_action = 'redeem' then 10 else 60 end;
end $$;
create function public.inout_reviewer_issue(p_token text, p_installation text, p_generation text, p_expires timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_expires <= now() or p_expires > now() + interval '7 days' then raise exception 'Invalid expiry'; end if;
  insert into inout_private.reviewer_grants values(p_token, p_installation, p_generation, p_expires, false);
end $$;
create function public.inout_reviewer_validate(p_token text, p_installation text, p_generation text)
returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('expiresAt', expires_at) from inout_private.reviewer_grants
  where token_hash = p_token and installation_hash = p_installation and generation = p_generation and not revoked and expires_at > now();
$$;
revoke all on function public.inout_reviewer_rate(text,text), public.inout_reviewer_issue(text,text,text,timestamptz), public.inout_reviewer_validate(text,text,text) from public, anon, authenticated;
grant execute on function public.inout_reviewer_rate(text,text), public.inout_reviewer_issue(text,text,text,timestamptz), public.inout_reviewer_validate(text,text,text) to service_role;
