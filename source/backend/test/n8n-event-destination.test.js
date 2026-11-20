import test from 'node:test';
import assert from 'node:assert/strict';
import { eventDestination, deliverJourneyEvents } from '../src/customer-event-outbox.js';

const secret = 'test-only-random-string-1234567890';

test('rejects unsafe or missing n8n destinations', () => {
  assert.equal(eventDestination({}), null);
  assert.equal(eventDestination({ ATSH_N8N_EVENT_URL: 'http://example.com/webhook/atsh-journey', ATSH_N8N_EVENT_TOKEN: secret }), null);
  assert.equal(eventDestination({ ATSH_N8N_EVENT_URL: 'https://n8n.atsh-ai.com/webhook/atsh-journey?secret=leak', ATSH_N8N_EVENT_TOKEN: secret }), null);
  assert.equal(eventDestination({ ATSH_N8N_EVENT_URL: 'https://n8n.atsh-ai.com/webhook/atsh-journey', ATSH_N8N_EVENT_TOKEN: 'short' }), null);
});

test('accepts HTTPS n8n destination with a long token', () => {
  assert.deepEqual(eventDestination({
    ATSH_N8N_EVENT_URL: 'https://n8n.atsh-ai.com/webhook/atsh-journey',
    ATSH_N8N_EVENT_TOKEN: secret
  }), {
    url: 'https://n8n.atsh-ai.com/webhook/atsh-journey',
    token: secret
  });
});

test('transmits the ATSH envelope and marks 202 event delivered', async () => {
  const statements = [];
  const pool = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("SET status='processing'")) return { rows: [{
        id: 71,
        event_type: 'contract.signed',
        idempotency_key: 'contract.signed:99',
        payload: { contractId: 99, quoteId: 60 },
        attempts: 1
      }] };
      return { rows: [] };
    }
  };
  let sent;
  const result = await deliverJourneyEvents(pool, {
    env: { ATSH_N8N_EVENT_URL: 'https://n8n.atsh-ai.com/webhook/atsh-journey', ATSH_N8N_EVENT_TOKEN: secret },
    fetchFn: async (url, options) => {
      sent = { url, options };
      return { ok: true, status: 202 };
    }
  });
  assert.equal(result.delivered, 1);
  assert.equal(result.failed, 0);
  assert.equal(sent.url, 'https://n8n.atsh-ai.com/webhook/atsh-journey');
  assert.equal(sent.options.headers.Authorization, `Bearer ${secret}`);
  assert.equal(sent.options.headers['X-ATSH-Idempotency-Key'], 'contract.signed:99');
  assert.equal(sent.options.headers['X-ATSH-Event-ID'], '71');
  assert.deepEqual(JSON.parse(sent.options.body), {
    id: 71,
    type: 'contract.signed',
    key: 'contract.signed:99',
    payload: { contractId: 99, quoteId: 60 }
  });
  assert.ok(statements.some(item => item.sql.includes("status='delivered'")));
});

test('n8n rejection leaves event pending for retry', async () => {
  const statements = [];
  const pool = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("SET status='processing'")) return { rows: [{
        id: 9, event_type: 'quote.changes_requested', idempotency_key: 'quote.changes_requested:2',
        payload: { requestId: 2 }, attempts: 1
      }] };
      return { rows: [] };
    }
  };
  const result = await deliverJourneyEvents(pool, {
    env: { ATSH_N8N_EVENT_URL: 'https://n8n.atsh-ai.com/webhook/atsh-journey', ATSH_N8N_EVENT_TOKEN: secret },
    fetchFn: async () => ({ ok: false, status: 503 })
  });
  assert.equal(result.failed, 1);
  assert.equal(result.delivered, 0);
  assert.ok(statements.some(item => item.sql.includes("status='pending'")));
});
