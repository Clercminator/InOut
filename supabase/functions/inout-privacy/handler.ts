export type VerifiedUser = { id: string; email: string; email_confirmed_at: string; is_anonymous?: boolean };
type Dependencies = {
  authenticate(token: string): Promise<VerifiedUser | null>;
  submit(user: VerifiedUser, kind: string, scope: string): Promise<{ status: string; id?: string }>;
};
const origin = 'https://inout.imrtech.xyz';
export function privacyHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if(req.headers.get('Origin') && req.headers.get('Origin') !== origin) return reply(403,{error:'Origin not allowed'});
    if(req.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if(req.method !== 'POST') return reply(405,{error:'Method not allowed'});
    const token = req.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if(!token || token.length > 8192) return reply(401,{error:'Verification required'});
    if(!req.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,{error:'JSON required'});
    if(Number(req.headers.get('Content-Length') ?? 0) > 1024) return reply(413,{error:'Request too large'});
    try {
      let size = 0, text = ''; const reader = req.body?.getReader();
      if(!reader) return reply(400,{error:'Invalid request'});
      const decoder = new TextDecoder();
      while(true) { const next = await reader.read(); if(next.done) break; size += next.value.byteLength; if(size > 1024) { await reader.cancel(); return reply(413,{error:'Request too large'}); } text += decoder.decode(next.value,{stream:true}); }
      text += decoder.decode();
      let body: {kind?: unknown; scope?: unknown; confirmed?: unknown};
      try { body = JSON.parse(text); } catch { return reply(400,{error:'Invalid request'}); }
      if(!body || body.confirmed !== true || !(body.kind === 'account' && body.scope === 'account' || body.kind === 'data' && ['all-eligible','welcome-email','support'].includes(String(body.scope)))) return reply(400,{error:'Confirm a valid request scope'});
      // Resolve identity with Auth on every call: never trust an email or decoded JWT supplied by the caller.
      const user = await deps.authenticate(token);
      if(!user?.id || !user.email || !user.email_confirmed_at || user.is_anonymous) return reply(401,{error:'Verified email account required'});
      const result = await deps.submit(user, body.kind as string, body.scope as string);
      if(result.status === 'limited') return reply(429,{error:'Please wait before trying again'});
      if(result.status !== 'pending' || !result.id) throw Error('Unexpected receipt');
      return reply(202,result);
    } catch { return reply(503,{error:'Request unavailable. Retry or contact support.'}); }
  };
}
