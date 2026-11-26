'use strict';

const { Pool } = require('pg');
const { credentialVersion, MAX_HISTORY } = require('./storage');

const schema = `
  CREATE TABLE IF NOT EXISTS mittcsn_accounts (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    credential_version uuid NOT NULL,
    history jsonb NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS mittcsn_sessions (
    token text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES mittcsn_accounts(id) ON DELETE CASCADE,
    credential_version uuid NOT NULL,
    expires_at timestamptz NOT NULL
  );
  CREATE INDEX IF NOT EXISTS mittcsn_sessions_expiry ON mittcsn_sessions(expires_at);
  CREATE TABLE IF NOT EXISTS mittcsn_auth_attempts (
    key text PRIMARY KEY,
    count integer NOT NULL,
    expires_at timestamptz NOT NULL
  );
  CREATE INDEX IF NOT EXISTS mittcsn_auth_attempts_expiry ON mittcsn_auth_attempts(expires_at);
`;

const accountFields = 'id, name, email, password, credential_version AS "credentialVersion"';

function createPostgresStorage(connectionString) {
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  pool.on('error', error => console.error('Databasanslutningen avbröts:', error.code ?? error.name));
  let initialized;

  async function initialize() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(184937621)');
      await client.query(schema);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function query(sql, values) {
    initialized ??= initialize().catch(error => {
      initialized = undefined;
      throw error;
    });
    await initialized;
    return pool.query(sql, values);
  }

  async function first(sql, values) {
    return (await query(sql, values)).rows[0];
  }

  return {
    close: () => pool.end(),
    getUserByEmail(email) {
      return first(`SELECT ${accountFields} FROM mittcsn_accounts WHERE email = $1`, [email]);
    },
    async createUser(user) {
      return Boolean(await first(
        'INSERT INTO mittcsn_accounts (id, name, email, password, credential_version) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING RETURNING id',
        [user.id, user.name, user.email, user.password, credentialVersion(user)],
      ));
    },
    saveName(id, name) {
      return first('UPDATE mittcsn_accounts SET name = $2 WHERE id = $1 RETURNING id, name, email', [id, name]);
    },
    changePassword(id, version, password, newVersion) {
      return first(`UPDATE mittcsn_accounts SET password = $3, credential_version = $4
        WHERE id = $1 AND credential_version = $2 RETURNING ${accountFields}`, [id, version, password, newVersion]);
    },
    async getHistory(id) {
      return (await first('SELECT history FROM mittcsn_accounts WHERE id = $1', [id]))?.history ?? [];
    },
    addHistory(id, item) {
      return first(`UPDATE mittcsn_accounts
        SET history = jsonb_path_query_array(jsonb_build_array($2::jsonb) || history, $3::jsonpath)
        WHERE id = $1 RETURNING id`, [id, JSON.stringify(item), `$[0 to ${MAX_HISTORY - 1}]`]);
    },
    deleteHistory(id, itemId) {
      return first(`UPDATE mittcsn_accounts
        SET history = (SELECT COALESCE(jsonb_agg(entry ORDER BY position), '[]')
          FROM jsonb_array_elements(history) WITH ORDINALITY AS items(entry, position)
          WHERE entry->>'id' <> $2)
        WHERE id = $1 AND history @> jsonb_build_array(jsonb_build_object('id', $2::text))
        RETURNING id`, [id, itemId]);
    },
    createSession(token, user, expires) {
      return query(`WITH expired AS (DELETE FROM mittcsn_sessions WHERE expires_at <= now())
        INSERT INTO mittcsn_sessions (token, user_id, credential_version, expires_at) VALUES ($1, $2, $3, $4)`,
      [token, user.id, credentialVersion(user), new Date(expires)]);
    },
    getSession(token) {
      return first(`SELECT a.id, a.name, a.email, a.password, a.credential_version AS "credentialVersion"
        FROM mittcsn_sessions AS s JOIN mittcsn_accounts AS a ON a.id = s.user_id
        WHERE s.token = $1 AND s.expires_at > now() AND s.credential_version = a.credential_version`, [token]);
    },
    deleteSession(token) {
      return query('DELETE FROM mittcsn_sessions WHERE token = $1', [token]);
    },
    async countAttempt(key, expires) {
      const row = await first(`WITH expired AS (DELETE FROM mittcsn_auth_attempts WHERE expires_at <= now())
        INSERT INTO mittcsn_auth_attempts (key, expires_at, count) VALUES ($1, $2, 1)
        ON CONFLICT (key) DO UPDATE SET count = LEAST(mittcsn_auth_attempts.count + 1, 1000)
        RETURNING count`, [key, new Date(expires)]);
      return row.count;
    },
  };
}

module.exports = { createPostgresStorage };
