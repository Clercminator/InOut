import { privacyHandler } from './handler.ts';
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
Deno.serve(privacyHandler({
  async authenticate(token) {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey:key, Authorization:`Bearer ${token}` }, signal:AbortSignal.timeout(8000) });
    if(response.status === 401 || response.status === 403) return null;
    if(!response.ok) throw Error('Auth unavailable');
    return response.json();
  },
  async submit(user,kind,scope) {
    const response = await fetch(`${url}/rest/v1/rpc/inout_privacy_request`, { method:'POST', headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'}, body:JSON.stringify({p_user:user.id,p_email:user.email,p_kind:kind,p_scope:scope}), signal:AbortSignal.timeout(8000) });
    if(!response.ok) throw Error('Storage unavailable');
    return response.json();
  },
}));
