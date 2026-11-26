'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const MAX_HISTORY = 20;
const dummyPassword = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = await scrypt(password, salt, 64);
  return `${salt}:${digest.toString('hex')}`;
}

async function passwordMatches(password, stored) {
  const valid = typeof stored === 'string' && /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(stored);
  const [salt, hash] = (valid ? stored : dummyPassword).split(':');
  const digest = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(digest, Buffer.from(hash, 'hex')) && valid;
}

function createLocalStorage() {
  const dataFile = process.env.SPARK_DATA_FILE || path.join(__dirname, 'data', 'accounts.json');
  const sessions = new Map();
  const attempts = new Map();

  function load() {
    try {
      return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return { users: [] };
      throw error;
    }
  }

  function save(db) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const tmp = `${dataFile}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, dataFile);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  function updateUser(id, update) {
    const db = load();
    const user = db.users.find(row => row.id === id);
    if (!user || !update(user)) return null;
    save(db);
    return user;
  }

  function consumeEmailAction(id, kind, token, update) {
    return updateUser(id, user => {
      const action = user.emailActions?.[kind];
      if (!action || action.token !== token || action.expires <= Date.now() ||
          action.version !== credentialVersion(user)) return false;
      delete user.emailActions[kind];
      update(user);
      return true;
    });
  }

  return {
    getUserByEmail(email) {
      return load().users.find(user => user.email === email);
    },
    createUser(user) {
      const db = load();
      if (db.users.some(row => row.email === user.email)) return false;
      db.users.push({ ...user, history: [] });
      save(db);
      return true;
    },
    saveName(id, name) {
      return updateUser(id, user => {
        user.name = name;
        return true;
      });
    },
    changePassword(id, version, password, newVersion) {
      return updateUser(id, user => {
        if (credentialVersion(user) !== version) return false;
        user.password = password;
        user.credentialVersion = newVersion;
        delete user.emailActions;
        return true;
      });
    },
    deleteUser(id, version) {
      const db = load();
      const index = db.users.findIndex(user => user.id === id && credentialVersion(user) === version);
      if (index === -1) return false;
      db.users.splice(index, 1);
      save(db);
      for (const [key, session] of sessions) {
        if (session.id === id) sessions.delete(key);
      }
      return true;
    },
    saveEmailAction(id, kind, action) {
      return updateUser(id, user => {
        if (credentialVersion(user) !== action.version) return false;
        user.emailActions ??= {};
        user.emailActions[kind] = action;
        return true;
      });
    },
    verifyEmail(id, token) {
      return consumeEmailAction(id, 'verify', token, user => { user.emailVerified = true; });
    },
    resetPassword(id, token, password, newVersion) {
      return consumeEmailAction(id, 'reset', token, user => {
        user.password = password;
        user.credentialVersion = newVersion;
        delete user.emailActions;
      });
    },
    getHistory(id) {
      return load().users.find(user => user.id === id)?.history ?? [];
    },
    addHistory(id, item) {
      return updateUser(id, user => {
        user.history = [item, ...(user.history ?? [])].slice(0, MAX_HISTORY);
        return true;
      });
    },
    renameHistory(id, itemId, title) {
      return updateUser(id, user => {
        const item = user.history?.find(entry => entry.id === itemId);
        if (!item) return false;
        item.title = title;
        return true;
      });
    },
    deleteHistory(id, itemId) {
      return updateUser(id, user => {
        const index = user.history?.findIndex(item => item.id === itemId) ?? -1;
        if (index < 0) return false;
        user.history.splice(index, 1);
        return true;
      });
    },
    createSession(token, user, expires) {
      for (const [key, session] of sessions) {
        if (session.expires <= Date.now()) sessions.delete(key);
      }
      sessions.set(token, { id: user.id, version: credentialVersion(user), expires });
    },
    getSession(token) {
      const session = sessions.get(token);
      if (!session || session.expires <= Date.now()) return null;
      return load().users.find(user => user.id === session.id && credentialVersion(user) === session.version);
    },
    deleteSession(token) {
      sessions.delete(token);
    },
    countAttempt(key, expires) {
      for (const [bucket, entry] of attempts) {
        if (entry.expires <= Date.now()) attempts.delete(bucket);
      }
      const count = (attempts.get(key)?.count ?? 0) + 1;
      attempts.set(key, { count, expires });
      return count;
    },
  };
}

function credentialVersion(user) {
  return user.credentialVersion ?? user.id;
}

module.exports = { createLocalStorage, credentialVersion, hashPassword, passwordMatches, MAX_HISTORY };
