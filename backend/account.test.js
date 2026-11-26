'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { createApp } = require('./app');
const { createPostgresStorage } = require('./postgres');

async function startServer(app, t) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, { method = 'GET', body, cookie, origin } = {}) => fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function sessionCookie(response) {
  const header = response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Strict/i);
  return header.split(';')[0];
}

async function verifyAccount(first, second, hosted, sent) {
  const email = `mittcsn-${randomUUID()}@example.test`;
  const password = 'fiktivt-testlosenord-1';
  const newPassword = 'fiktivt-testlosenord-2';
  const registration = { method: 'POST', body: { name: 'Mitt testkonto', email, password } };

  const { status } = await first('/api/auth/register', { ...registration, origin: 'https://example.test' });
  assert.equal(status, 403);
  const registrations = await Promise.all([
    first('/api/auth/register', registration),
    second('/api/auth/register', registration),
  ]);
  assert.deepEqual(registrations.map(response => response.status).sort(), [201, 409]);
  const created = registrations.find(response => response.status === 201);
  const account = (await created.json()).user;
  assert.deepEqual(Object.keys(account).sort(), ['email', 'emailVerified', 'id', 'name']);
  if (hosted) assert.match(created.headers.get('set-cookie'), /; Secure/i);
  const cookie = sessionCookie(created);
  assert.equal(account.emailVerified, false);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].kind, 'verify');
  assert.equal(sent[0].email, email);

  const resetRequest = { method: 'POST', body: { email } };
  assert.equal((await first('/api/auth/reset/request', resetRequest)).status, 200);
  assert.equal(sent.length, 1);
  const verify = { method: 'POST', body: { token: sent[0].token } };
  assert.equal((await second('/api/auth/verify/confirm', verify)).status, 200);
  assert.equal((await first('/api/auth/verify/confirm', verify)).status, 400);

  const profile = await second('/api/auth/profile', { method: 'PATCH', body: { name: 'Nytt namn' }, cookie });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).user.name, 'Nytt namn');
  const me = await first('/api/auth/me', { cookie });
  assert.equal(me.headers.get('cache-control'), 'no-store');
  const { user, emailAvailable } = await me.json();
  assert.equal(user.name, 'Nytt namn');
  assert.equal(emailAvailable, true);
  assert.equal(user.emailVerified, true);

  const input = { loanAmount: 250000, interestRate: 2.135, repaymentYears: 20, paymentFrequency: 'monthly', extraPayment: 500, annualFee: 150, title: 'Grundplan' };
  const saved = await Promise.all(Array.from({ length: 22 }, () => first('/api/history', { method: 'POST', body: input, cookie })));
  saved.forEach(response => assert.equal(response.status, 201));
  const { history } = await (await second('/api/history', { cookie })).json();
  assert.equal(history.length, 20);
  assert.equal(new Set(history.map(item => item.id)).size, 20);
  assert.ok(history.every(item => item.extraPayment === 500 && item.annualFee === 150 && item.result.fees > 0 && item.title === 'Grundplan'));
  const renamed = await second('/api/history/' + history[0].id, {
    method: 'PATCH', body: { title: '  500 kr extra  ' }, cookie,
  });
  assert.equal(renamed.status, 200);
  const renamedHistory = (await (await first('/api/history', { cookie })).json()).history;
  assert.equal(renamedHistory[0].title, '500 kr extra');
  assert.equal(renamedHistory[1].title, 'Grundplan');

  const login = (request, value) => request('/api/auth/login', { method: 'POST', body: { email, password: value } });
  const otherCookie = sessionCookie(await login(first, password));
  const wrongPassword = await first('/api/auth/password', {
    method: 'PATCH', body: { currentPassword: newPassword, newPassword: password }, cookie,
  });
  assert.equal(wrongPassword.status, 400);
  const changed = await second('/api/auth/password', {
    method: 'PATCH', body: { currentPassword: password, newPassword }, cookie,
  });
  assert.equal(changed.status, 200);
  const currentCookie = sessionCookie(changed);
  assert.equal((await first('/api/history', { cookie })).status, 401);
  assert.equal((await second('/api/history', { cookie: otherCookie })).status, 401);
  assert.equal((await login(first, password)).status, 401);
  assert.equal((await login(second, newPassword)).status, 200);

  const remove = await second('/api/history/' + history[0].id, { method: 'DELETE', body: {}, cookie: currentCookie });
  assert.equal(remove.status, 200);
  const logout = await second('/api/auth/logout', { method: 'POST', body: {}, cookie: currentCookie });
  assert.equal(logout.status, 200);
  assert.equal((await first('/api/history', { cookie: currentCookie })).status, 401);

  const resetCookie = sessionCookie(await login(first, newPassword));
  const unknown = await second('/api/auth/reset/request', {
    method: 'POST', body: { email: 'unknown@example.test' },
  });
  assert.deepEqual(await unknown.json(), { ok: true });
  assert.equal(sent.length, 1);
  assert.equal((await second('/api/auth/reset/request', resetRequest)).status, 200);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].kind, 'reset');
  const confirm = { method: 'POST', body: { token: sent[1].token, newPassword: password } };
  const confirmations = await Promise.all([
    first('/api/auth/reset/confirm', confirm),
    second('/api/auth/reset/confirm', confirm),
  ]);
  assert.deepEqual(confirmations.map(response => response.status).sort(), [200, 400]);
  assert.equal((await first('/api/history', { cookie: resetCookie })).status, 401);
  const previousPassword = await login(second, newPassword);
  assert.equal(previousPassword.status, 401);
  const deletionCookie = sessionCookie(await login(second, password));
  assert.equal((await first('/api/auth/account', {
    method: 'DELETE', body: { password }, cookie: deletionCookie,
  })).status, 400);
  assert.equal((await first('/api/auth/account', {
    method: 'DELETE', body: { password: newPassword, confirmed: true }, cookie: deletionCookie,
  })).status, 400);
  assert.equal((await second('/api/auth/account', {
    method: 'DELETE', body: { password, confirmed: true }, cookie: deletionCookie,
  })).status, 200);
  assert.equal((await first('/api/history', { cookie: deletionCookie })).status, 401);
  assert.equal((await second('/api/auth/reset/confirm', confirm)).status, 400);
  const registeredAgain = await first('/api/auth/register', registration);
  assert.equal(registeredAgain.status, 201);
  const newHistory = await first('/api/history', { cookie: sessionCookie(registeredAgain) });
  assert.deepEqual((await newHistory.json()).history, []);
}

test('profil, lösenordsbyte och historik fungerar i den lokala appen', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'mittcsn-accounts-'));
  process.env.SPARK_DATA_FILE = join(dir, 'accounts.json');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const sent = [];
  const request = await startServer(createApp({ databaseUrl: '', sendMail: async message => sent.push(message) }), t);
  await verifyAccount(request, request, false, sent);
});

const testDatabase = process.env.MITTCSN_TEST_DATABASE_URL;
test('konton och sessioner delas mellan två webbinstanser med PostgreSQL', { skip: !testDatabase }, async t => {
  const a = createPostgresStorage(testDatabase);
  const b = createPostgresStorage(testDatabase);
  t.after(() => Promise.all([a.close(), b.close()]));
  const sent = [];
  const sendMail = async message => sent.push(message);
  const first = await startServer(createApp({ hosted: true, store: a, sendMail }), t);
  const second = await startServer(createApp({ hosted: true, store: b, sendMail }), t);
  await verifyAccount(first, second, true, sent);
});

test('webbversionen utan databas kan räkna och stänger av konton', async t => {
  const request = await startServer(createApp({ hosted: true, databaseUrl: '' }), t);
  const me = await request('/api/auth/me');
  assert.deepEqual(await me.json(), { user: null, demo: true });
  assert.equal((await request('/api/auth/register', { method: 'POST', body: {} })).status, 503);
  assert.equal((await request('/api/calculate', {
    method: 'POST', body: { loanAmount: 12000, interestRate: 0, repaymentYears: 2, paymentFrequency: 'monthly' },
  })).status, 200);
});
