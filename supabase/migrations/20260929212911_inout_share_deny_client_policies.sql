create policy inout_shares_deny_clients on inout_private.shares
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy inout_share_limits_deny_clients on inout_private.share_limits
  as restrictive for all to anon, authenticated using (false) with check (false);
