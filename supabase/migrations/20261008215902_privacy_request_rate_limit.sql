create table inout_private.privacy_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket timestamptz not null,
  used integer not null,
  primary key(user_id,bucket)
);
alter table inout_private.privacy_limits enable row level security;
revoke all on inout_private.privacy_limits from public,anon,authenticated;
grant select,insert,update,delete on inout_private.privacy_limits to service_role;
create policy deny_clients on inout_private.privacy_limits to anon,authenticated using(false) with check(false);
alter function public.inout_privacy_request(uuid,text,text,text) set schema inout_private;
create function public.inout_privacy_request(p_user uuid,p_email text,p_kind text,p_scope text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare amount integer; period timestamptz := date_trunc('hour',now());
begin
  if not exists(select 1 from auth.users where id=p_user and email=p_email and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception 'Invalid identity'; end if;
  delete from inout_private.privacy_limits where bucket < now()-interval '1 day';
  insert into inout_private.privacy_limits values(p_user,period,1)
    on conflict(user_id,bucket) do update set used=least(inout_private.privacy_limits.used+1,21) returning used into amount;
  if amount>20 then return jsonb_build_object('status','limited'); end if;
  return inout_private.inout_privacy_request(p_user,p_email,p_kind,p_scope);
end $$;
revoke all on function public.inout_privacy_request(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.inout_privacy_request(uuid,text,text,text) to service_role;
