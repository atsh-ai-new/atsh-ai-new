import { createHmac, timingSafeEqual } from 'node:crypto';

const base = 'https://api.xpay.app';
export function xpayConfig(env = process.env) {
  const key = env.XPAY_SECRET_KEY || '';
  const secret = env.XPAY_WEBHOOK_SECRET || '';
  const enabled = env.XPAY_ENABLED === 'true';
  if (!enabled) return null;
  if (!key.startsWith('sk_test_') || !secret.startsWith('whsec_'))
    throw new Error('XPay test credentials required; live payments disabled');
  return { key, secret };
}
export function verifyXpaySignature(raw, header, secret, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || !raw.length || raw.length > 262144 ||
      typeof header !== 'string' || typeof secret !== 'string' || !secret.startsWith('whsec_')) return false;
  const parts = header.split(',').map(x => x.trim());
  const times = parts.filter(x => x.startsWith('t='));
  const signatures = parts.filter(x => x.startsWith('v1='));
  if (times.length !== 1 || signatures.length !== 1) return false;
  const t = times[0].slice(2), sig = signatures[0].slice(3);
  if (!/^\d{10}$/.test(t) || !/^[a-f0-9]{64}$/i.test(sig) || Math.abs(now - Number(t)*1000) > 300000) return false;
  const expected = createHmac('sha256', secret).update(t + '.').update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(sig, 'hex'));
}
function validateSession(session, amount) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(session?.id || '') || session.currency !== 'EGP' || session.amountTotal !== amount)
    throw new Error('Unexpected XPay session');
  return session;
}
export async function createXpaySession({ key, invoiceId, amountPiasters, attemptId, returnUrl, fetcher = fetch }) {
  if (!key?.startsWith('sk_test_')) throw new Error('Test key required');
  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1 || !Number.isSafeInteger(amountPiasters) || amountPiasters < 1 ||
      typeof attemptId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(attemptId)) throw new Error('Invalid invoice or attempt');
  const redirect = new URL(returnUrl);
  if (redirect.origin !== 'https://atsh-ai.com' || redirect.username || redirect.password) throw new Error('Invalid return URL');
  const res = await fetcher(base + '/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': attemptId },
    body: JSON.stringify({ afterCompletion: { type: 'redirect', redirect: { url: redirect.href } },
      lineItems: [{ priceData: { currency: 'EGP', unitAmount: amountPiasters, productData: { name: 'ATSH AI invoice #' + invoiceId } }, quantity: 1 }] }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error('XPay checkout request failed: ' + res.status);
  const s = validateSession(await res.json(), amountPiasters);
  const url = new URL(s.url);
  if (url.origin !== 'https://checkout.xpay.app' || url.username || url.password || s.status !== 'open') throw new Error('Invalid checkout URL or status');
  return { id: s.id, url: url.href, amountPiasters };
}
export async function retrieveXpaySession({ key, sessionId, fetcher = fetch }) {
  if (!key?.startsWith('sk_test_') || !/^cs_test_[A-Za-z0-9]+$/.test(sessionId)) throw new Error('Invalid test session');
  const res = await fetcher(base + '/checkout/sessions/' + encodeURIComponent(sessionId), {
    headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error('XPay verification failed: ' + res.status);
  return res.json();
}
// Only classify sandbox results; NEVER write these to the real invoice ledger.
export function verifiedTestPayment(session, attempt) {
  if (!attempt || !Number.isSafeInteger(attempt.amountPiasters) || attempt.amountPiasters < 1 ||
      session?.id !== attempt.sessionId || !/^cs_test_[A-Za-z0-9]+$/.test(session?.id || '') ||
      session.currency !== 'EGP' || session.amountTotal !== attempt.amountPiasters ||
      session.status !== 'complete' || session.paymentStatus !== 'paid') return null;
  return { provider: 'xpay_test', reference: session.id, amountPiasters: session.amountTotal };
}
