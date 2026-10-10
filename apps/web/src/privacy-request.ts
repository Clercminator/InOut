declare const __AUTH_URL__: string;
declare const __AUTH_KEY__: string;
declare const __SITE_URL__: string;
const verify = document.querySelector<HTMLFormElement>('#verify-form')!;
const request = document.querySelector<HTMLFormElement>('#request-form')!;
const status = document.querySelector<HTMLElement>('#request-status')!;
const identity = document.querySelector<HTMLElement>('#identity')!;
const kind = location.pathname.startsWith('/delete-account') ? 'account' : 'data';
let token = '';
const show = (message: string) => { status.textContent = message; };
async function call(path: string, body?: unknown, authorization = '') {
  const response = await fetch(__AUTH_URL__ + path, { method: body ? 'POST' : 'GET', headers: { apikey: __AUTH_KEY__, ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error(response.status === 429 ? 'Too many attempts. Please wait before trying again.' : response.status === 401 || response.status === 403 ? 'Verification has expired or is unavailable. Request a new link or contact support.' : 'This service is temporarily unavailable. Please retry or use the email request below.');
  return response.json();
}
async function busy(form: HTMLFormElement, action: () => Promise<void>) {
  const button = form.querySelector<HTMLButtonElement>('button')!; button.disabled = true;
  try { await action(); } catch (e) { show(e instanceof Error && e.name === 'Error' ? e.message : 'Could not connect. Please try again or use the email request below.'); } finally { button.disabled = false; }
}
verify.addEventListener('submit', event => {
  event.preventDefault(); if(!verify.reportValidity()) return;
  void busy(verify, async () => {
    const email = document.querySelector<HTMLInputElement>('#email')!.value.trim();
    await call(`/auth/v1/otp?redirect_to=${encodeURIComponent(`${__SITE_URL__}/delete-${kind}`)}`, { email, create_user: false });
    show('If an eligible account exists and delivery is available, a verification link will arrive by email. Open it to continue. If no email arrives, use the support request below.');
  });
});
request.addEventListener('submit', event => {
  event.preventDefault(); if(!request.reportValidity()) return;
  void busy(request, async () => {
    const scope = document.querySelector<HTMLSelectElement>('#scope')!.value;
    const result = await call('/functions/v1/inout-privacy', { kind, scope, confirmed: true }, token);
    if(result.status !== 'pending' || typeof result.id !== 'string') throw Error('Request status could not be verified. Contact support.');
    show(`Request received. Reference: ${result.id}. IMR Tech SpA will review your request and contact your verified account email. This confirms receipt, not completed deletion. Local phone data and store subscriptions are unaffected.`);
    request.hidden = true; token = '';
  });
});
// Remove auth fragments immediately. Tokens stay in this page's memory only.
const fragment = new URLSearchParams(location.hash.slice(1));
history.replaceState(null, '', location.pathname);
if(fragment.has('error')) show('This verification link has expired or is invalid. Request a new link or contact support.');
if(fragment.has('access_token')) {
  token = fragment.get('access_token')!;
  show('Verifying account…');
  void call('/auth/v1/user', undefined, token).then(user => {
    if(!user.email || !user.email_confirmed_at || user.is_anonymous) throw Error('A verified email account is required. Use the email request below for guest data.');
    identity.textContent = `Verified account: ${user.email}`;
    verify.hidden = true; request.hidden = false; show('Review the scope, then confirm your request.');
  }).catch(e => { token = ''; show(e.message); });
}
export {};
