create schema if not exists inout_private;
grant usage on schema inout_private to service_role;
create table inout_private.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  kind text not null check (kind in ('account','data')),
  scope text not null check (scope in ('account','all-eligible','welcome-email','support')),
  status text not null default 'pending' check (status in ('pending','completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((kind='account' and scope='account') or (kind='data' and scope<>'account')),
  check ((status='pending' and completed_at is null) or (status='completed' and completed_at is not null and email is null and user_id is null))
);
create unique index privacy_requests_pending on inout_private.privacy_requests(user_id,kind,scope) where status='pending';
alter table inout_private.privacy_requests enable row level security;
revoke all on inout_private.privacy_requests from public, anon, authenticated;
grant select, insert, update, delete on inout_private.privacy_requests to service_role;
create policy deny_clients on inout_private.privacy_requests to anon, authenticated using (false) with check (false);
create function public.inout_privacy_request(p_user uuid,p_email text,p_kind text,p_scope text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare receipt inout_private.privacy_requests;
begin
  if p_user is null or p_email is null or length(p_email)>254 or position('@' in p_email)<2 then raise exception 'Invalid identity'; end if;
  if not exists(select 1 from auth.users where id=p_user and email=p_email and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'Invalid identity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,1028));
  delete from inout_private.privacy_requests where status='completed' and completed_at < now()-interval '90 days';
  select * into receipt from inout_private.privacy_requests where user_id=p_user and kind=p_kind and scope=p_scope and status='pending';
  if found then return jsonb_build_object('status','pending','id',receipt.id); end if;
  if (select count(*) from inout_private.privacy_requests where user_id=p_user and created_at>now()-interval '1 day')>=4 then return jsonb_build_object('status','limited'); end if;
  insert into inout_private.privacy_requests(user_id,email,kind,scope) values(p_user,p_email,p_kind,p_scope) returning * into receipt;
  return jsonb_build_object('status','pending','id',receipt.id);
end $$;
revoke all on function public.inout_privacy_request(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.inout_privacy_request(uuid,text,text,text) to service_role;
