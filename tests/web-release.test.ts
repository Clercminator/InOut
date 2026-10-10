import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { privacyHandler, type VerifiedUser } from '../supabase/functions/inout-privacy/handler';

test('privacy requests enforce verified ownership, confirmation, size, origin and private errors', async () => {
  const user = {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',email:'fixture@example.test',email_confirmed_at:new Date().toISOString()};
  let identity: VerifiedUser | null = user, calls = 0;
  const handler = privacyHandler({authenticate:async token=>token==='valid'?identity:null,submit:async (actual,kind,scope)=>{calls++;assert.equal(actual.id,user.id);assert.equal(kind,'data');assert.equal(scope,'support');return {status:'pending',id:'receipt'};}});
  const call = (body: unknown, token='valid', origin='https://inout.imrtech.xyz') => handler(new Request('https://fixture.test',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}));
  assert.equal((await call({kind:'data',scope:'support',confirmed:true},'wrong')).status,401);
  assert.equal((await call({kind:'data',scope:'support',confirmed:true},'valid','https://attacker.test')).status,403);
  assert.equal((await call({kind:'account',scope:'support',confirmed:true})).status,400);
  assert.equal((await call({kind:'data',scope:'support',confirmed:false})).status,400);
  assert.equal((await call({data:'x'.repeat(1100)})).status,413);
  identity={...user,is_anonymous:true}; assert.equal((await call({kind:'data',scope:'support',confirmed:true})).status,401);
  identity={...user,email_confirmed_at:''}; assert.equal((await call({kind:'data',scope:'support',confirmed:true})).status,401);
  identity=user; assert.equal(calls,0);
  const ok=await call({kind:'data',scope:'support',confirmed:true,email:'victim@example.test'});assert.equal(ok.status,202);assert.equal(ok.headers.get('Cache-Control'),'no-store');assert.equal(calls,1);
  const broken=privacyHandler({authenticate:async()=>{throw Error('private server secret');},submit:async()=>({status:'pending'})});
  const failed=await broken(new Request('https://fixture.test',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({kind:'account',scope:'account',confirmed:true})}));
  assert.equal(failed.status,503); assert.doesNotMatch(await failed.text(),/secret/);
});

test('privacy SQL prevents duplicate requests and isolates client roles; completed receipts lose identity',async()=>{
  const db=new PGlite();
  try {
    await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);grant usage on schema auth to service_role;grant select on auth.users to service_role;");
    await db.exec(readFileSync('supabase/migrations/20261008214815_privacy_requests.sql','utf8'));
    await db.exec(readFileSync('supabase/migrations/20261008215902_privacy_request_rate_limit.sql','utf8'));
    const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[user,'fixture@example.test']);
    for(const role of ['anon','authenticated']) {await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from inout_private.privacy_requests'),/permission denied/);await assert.rejects(db.query("select public.inout_privacy_request($1,'fixture@example.test','account','account')",[user]),/permission denied/);await db.exec('reset role');}
    await db.exec('set role service_role');
    const submit=async(kind:string,scope:string)=> (await db.query<{receipt:{id:string;status:string}}>('select public.inout_privacy_request($1,$2,$3,$4) as receipt',[user,'fixture@example.test',kind,scope])).rows[0].receipt;
    const first=await submit('account','account');assert.equal(first.status,'pending');assert.deepEqual(await submit('account','account'),first);
    await submit('data','support'); await submit('data','welcome-email');await submit('data','all-eligible');
    await assert.rejects(db.query("select public.inout_privacy_request($1,'victim@example.test','account','account')",[user]),/Invalid identity/);
    await assert.rejects(db.query("update inout_private.privacy_requests set status='completed',completed_at=now() where id=$1",[first.id]),/check constraint/);
    await db.query("update inout_private.privacy_requests set status='completed',completed_at=now(),email=null,user_id=null where id=$1",[first.id]);
    assert.equal((await db.query('select email,user_id from inout_private.privacy_requests where id=$1',[first.id])).rows[0].email,null);
    await db.query('update inout_private.privacy_limits set used=20 where user_id=$1',[user]);
    assert.equal((await submit('data','support')).status,'limited');
  } finally {await db.close();}
});

test('built public surface has canonical routes, usable deletion forms and no privileged keys',()=>{
  for(const page of ['index','privacy','terms','support','delete-account','delete-data','safety']) {
    const html=readFileSync(`apps/web/public/${page}.html`,'utf8');
    assert.match(html,/IMR Tech SpA/);assert.match(html,new RegExp(`rel="canonical" href="https://inout.imrtech.xyz/${page==='index'?'':page}"`));
    assert.match(html,/og:image/);assert.match(html,/twitter:card/);assert.match(html,/href="\/delete-data"/);assert.doesNotMatch(html,/Lorem ipsum|href="#"|service_role|sb_secret_/i);
    if(page.startsWith('delete-')) {assert.match(html,/type="email"/);assert.match(html,/type="checkbox" required/);assert.match(html,/role="status"/);assert.match(html,/mailto:davidclerc@imrtech.xyz/);}
  }
  assert.match(readFileSync('apps/web/public/404.html','utf8'),/Page not found/);
  const bundle=readFileSync('apps/web/public/privacy-request.js','utf8');assert.doesNotMatch(bundle,/service_role|sb_secret_|localStorage|sessionStorage/);assert.match(bundle,/create_user:!1/);
});
