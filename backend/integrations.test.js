'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createMailer } = require('./email');
const { createAiClient } = require('./chat');
const { createApp } = require('./app');

test('EmailJS använder projektspecifik mall och servernyckel för båda kontolänkarna', async () => {
  const requests = [];
  const send = createMailer({
    hosted: true,
    env: {
      MITTCSN_BASE_URL: 'https://mittcsn.example',
      EMAILJS_SERVICE_ID: 'test-service',
      EMAILJS_TEMPLATE_ID: 'test-template',
      EMAILJS_PUBLIC_KEY: 'test-public',
      EMAILJS_PRIVATE_KEY: 'test-private',
      RESEND_API_KEY: 'existing-resend',
      MITTCSN_EMAIL_FROM: 'konto@example.test',
    },
    fetchImpl: async (endpoint, options) => {
      requests.push({ endpoint, payload: JSON.parse(options.body) });
      return { ok: true };
    },
  });
  await send({ email: 'konto@example.test', kind: 'verify', token: 'test-link' });
  await send({ email: 'konto@example.test', kind: 'reset', token: 'test-link' });
  const template = readFileSync(path.join(__dirname, '../templates/emailjs-account.html'), 'utf8');
  const placeholders = [...template.matchAll(/{{(\w+)}}/g)].map(match => match[1]);
  for (const { endpoint, payload } of requests) {
    assert.ok(placeholders.every(name => typeof payload.template_params[name] === 'string'));
    assert.match(payload.template_params.message, /Länken kan användas en gång/);
    assert.equal(endpoint, 'https://api.emailjs.com/api/v1.0/email/send');
    assert.equal(payload.service_id, 'test-service');
    assert.equal(payload.template_id, 'test-template');
    assert.equal(payload.accessToken, 'test-private');
    assert.equal(payload.template_params.to_email, 'konto@example.test');
    assert.match(payload.template_params.action_url, /^https:\/\/mittcsn.example\/email-action.html#action=(verify|reset)&token=test-link$/);
  }
  assert.equal(requests[0].payload.template_params.action_label, 'Verifiera e-postadressen');
  assert.equal(requests[0].payload.template_params.expires_in, '24 timmar');
  assert.equal(requests[1].payload.template_params.action_label, 'Välj nytt lösenord');
  assert.equal(requests[1].payload.template_params.expires_in, '30 minuter');
});

test('AI-klienten skickar bara den aktuella frågan utan sparad konversation', async () => {
  const ask = createAiClient({
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async (_endpoint, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.store, false);
      assert.equal(payload.input, 'Hur fungerar ränta?');
      assert.equal(payload.max_output_tokens, 200);
      assert.equal(payload.previous_response_id, undefined);
      return {
        ok: true,
        json: async () => ({ output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Räntan är kostnaden för att låna.' }] }] }),
      };
    },
  });
  assert.equal(await ask('Hur fungerar ränta?'), 'Räntan är kostnaden för att låna.');
});

test('chatten kräver aktivt AI-val, avvisar känsliga uppgifter och begränsar anropen', async t => {
  const calls = [];
  const buckets = new Map();
  const app = createApp({
    sendMail: null,
    askAi: async question => {
      calls.push(question);
      return 'Ett förklarande AI-svar.';
    },
    store: {
      countAttempt(key) {
        const count = (buckets.get(key) ?? 0) + 1;
        buckets.set(key, count);
        return count;
      },
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/chat`;
  const send = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  assert.deepEqual(await (await fetch(url)).json(), { aiAvailable: true });
  assert.equal((await (await send({ question: 'Vad är årsavgift?' })).json()).source, 'guide');
  assert.equal((await send({ question: 'Min mejl är test@example.test', useAi: true })).status, 400);
  assert.equal(calls.length, 0);
  for (let index = 0; index < 5; index++) {
    assert.deepEqual(await (await send({ question: 'Vad är årsavgift?', useAi: true })).json(), {
      answer: 'Ett förklarande AI-svar.', source: 'ai',
    });
  }
  const limited = await (await send({ question: 'Vad är årsavgift?', useAi: true })).json();
  assert.equal(limited.source, 'guide');
  assert.equal(limited.limited, true);
  assert.equal(calls.length, 5);
});
