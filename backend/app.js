'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { calculateLoan } = require('./calculator');
const { createLocalStorage, credentialVersion, hashPassword, passwordMatches } = require('./storage');

const SESSION_MS = 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const SESSION_COOKIE = 'spark_session';
const ACCOUNT_UNAVAILABLE = 'Konton är tillfälligt otillgängliga. Du kan fortfarande använda kalkylatorn.';

function cookieToken(req) {
  const match = (req.headers.cookie ?? '').match(/(?:^|;\s*)spark_session=([a-f0-9]{64})(?:;|$)/);
  return match ? digest(match[1]) : null;
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function publicUser({ id, name, email }) {
  return { id, name, email };
}

function normalized(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validName(name) {
  return name.length >= 2 && name.length <= 70;
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}

function createApp({ hosted = false, databaseUrl = process.env.DATABASE_URL, store } = {}) {
  const app = express();
  const storage = store ?? (databaseUrl
    ? require('./postgres').createPostgresStorage(databaseUrl)
    : hosted ? null : createLocalStorage());
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: hosted || process.env.NODE_ENV === 'production',
  };

  app.disable('x-powered-by');
  if (hosted && process.env.VERCEL === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin) {
        try {
          const url = new URL(origin);
          if (url.host !== req.get('host') || (hosted && url.protocol !== 'https:')) {
            return res.status(403).json({ error: 'Förfrågan från annan webbplats avvisades.' });
          }
        } catch {
          return res.status(403).json({ error: 'Ogiltigt ursprung.' });
        }
      }
      if (!req.is('application/json')) return res.status(415).json({ error: 'Skicka JSON-data.' });
    }
    next();
  });
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', application: 'MittCSN' }));
  app.post('/api/calculate', (req, res) => {
    const answer = calculateLoan(req.body);
    res.status(answer.valid ? 200 : 400).json(answer);
  });

  app.use(['/api/auth', '/api/history'], (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/auth/me', async (req, res) => {
    if (!storage) return res.json({ user: null, demo: true });
    const user = await currentUser(req);
    res.json({ user: user ? publicUser(user) : null });
  });
  app.use(['/api/auth', '/api/history'], (_req, res, next) => {
    if (!storage) return res.status(503).json({ error: ACCOUNT_UNAVAILABLE });
    next();
  });

  async function currentUser(req) {
    const token = cookieToken(req);
    return token ? storage.getSession(token) : null;
  }

  async function requireUser(req, res, next) {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'Logga in för att fortsätta.' });
    req.account = user;
    next();
  }

  async function startSession(req, res, user) {
    const oldToken = cookieToken(req);
    const token = crypto.randomBytes(32).toString('hex');
    await storage.createSession(digest(token), user, Date.now() + SESSION_MS);
    if (oldToken) await storage.deleteSession(oldToken);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MS });
  }

  async function overLimit(req, scope, max) {
    const bucket = Math.floor(Date.now() / ATTEMPT_WINDOW_MS);
    const key = digest(JSON.stringify([scope, req.ip, bucket]));
    return await storage.countAttempt(key, (bucket + 1) * ATTEMPT_WINDOW_MS) > max;
  }

  function tooManyAttempts(res) {
    res.set('Retry-After', String(Math.ceil((ATTEMPT_WINDOW_MS - Date.now() % ATTEMPT_WINDOW_MS) / 1000)));
    return res.status(429).json({ error: 'För många försök. Försök igen om en stund.' });
  }

  app.post('/api/auth/register', async (req, res) => {
    const name = normalized(req.body?.name);
    const email = normalized(req.body?.email).toLowerCase();
    const password = req.body?.password;
    if (!validName(name)) return res.status(400).json({ error: 'Ange ett namn med 2–70 tecken.' });
    if (!validEmail(email)) return res.status(400).json({ error: 'Ange en giltig e-postadress.' });
    if (!validPassword(password)) return res.status(400).json({ error: 'Lösenordet måste vara 12–128 tecken.' });
    if (await overLimit(req, 'register', 10)) return tooManyAttempts(res);

    const user = { id: crypto.randomUUID(), name, email, password: await hashPassword(password) };
    if (!await storage.createUser(user)) {
      return res.status(409).json({ error: 'E-postadressen används redan. Prova att logga in.' });
    }
    await startSession(req, res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = normalized(req.body?.email).toLowerCase();
    const password = req.body?.password;
    const error = 'Fel e-postadress eller lösenord.';
    if (!validEmail(email) || !validPassword(password)) return res.status(401).json({ error });
    if (await overLimit(req, 'login', 40) || await overLimit(req, ['login', email], 10)) {
      return tooManyAttempts(res);
    }
    const user = await storage.getUserByEmail(email);
    if (!await passwordMatches(password, user?.password)) return res.status(401).json({ error });
    await startSession(req, res, user);
    res.json({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = cookieToken(req);
    if (token) await storage.deleteSession(token);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ ok: true });
  });

  app.patch('/api/auth/profile', requireUser, async (req, res) => {
    const name = normalized(req.body?.name);
    if (!validName(name)) return res.status(400).json({ error: 'Ange ett namn med 2–70 tecken.' });
    const user = await storage.saveName(req.account.id, name);
    res.json({ user: publicUser(user) });
  });

  app.patch('/api/auth/password', requireUser, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!validPassword(newPassword)) return res.status(400).json({ error: 'Det nya lösenordet måste vara 12–128 tecken.' });
    if (!validPassword(currentPassword)) return res.status(400).json({ error: 'Nuvarande lösenord är fel.' });
    if (currentPassword === newPassword) return res.status(400).json({ error: 'Ange ett nytt lösenord.' });
    if (await overLimit(req, ['password', req.account.id], 10)) return tooManyAttempts(res);
    if (!await passwordMatches(currentPassword, req.account.password)) {
      return res.status(400).json({ error: 'Nuvarande lösenord är fel.' });
    }
    const user = await storage.changePassword(
      req.account.id, credentialVersion(req.account), await hashPassword(newPassword), crypto.randomUUID(),
    );
    if (!user) return res.status(409).json({ error: 'Lösenordet ändrades från en annan session. Logga in igen.' });
    await startSession(req, res, user);
    res.json({ ok: true });
  });

  app.get('/api/history', requireUser, async (req, res) => {
    res.json({ history: await storage.getHistory(req.account.id) });
  });
  app.post('/api/history', requireUser, async (req, res) => {
    const answer = calculateLoan(req.body);
    if (!answer.valid) return res.status(400).json(answer);
    const item = { id: crypto.randomUUID(), at: new Date().toISOString(), ...answer.data, result: answer.result };
    await storage.addHistory(req.account.id, item);
    res.status(201).json({ saved: true, item });
  });
  app.delete('/api/history/:id', requireUser, async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
      return res.status(400).json({ error: 'Ogiltigt id för sparad beräkning.' });
    }
    if (!await storage.deleteHistory(req.account.id, req.params.id)) {
      return res.status(404).json({ error: 'Beräkningen hittades inte på ditt konto.' });
    }
    res.json({ deleted: true });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API-adressen finns inte.' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
  app.use((_req, res) => res.status(404).send('Sidan finns inte.'));
  app.use((error, req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON-formatet är ogiltigt.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Förfrågan är för stor.' });
    console.error('Serverfel:', error.code ?? error.name);
    if (/^\/api\/(auth|history)(\/|$)/i.test(req.path)) {
      return res.status(503).json({ error: ACCOUNT_UNAVAILABLE });
    }
    res.status(500).json({ error: 'Ett oväntat fel uppstod.' });
  });

  return app;
}

const app = createApp();
module.exports = app;
module.exports.createApp = createApp;
