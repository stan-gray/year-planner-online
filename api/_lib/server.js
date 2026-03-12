const { Pool } = require("pg")
const crypto = require("crypto")

const APP_VERSION = "4.0"
const SESSION_COOKIE = "year_planner_session"
const SESSION_TTL_DAYS = 30

let pool
let schemaReadyPromise

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured")
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  }

  return pool
}

async function ensureSchema() {
  if (!schemaReadyPromise) {
    const db = getPool()
    schemaReadyPromise = db.query(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS planner_states (
        planner_id TEXT PRIMARY KEY,
        owner_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL,
        planner_data JSONB NOT NULL,
        app_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE planner_states ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS planner_states_owner_user_id_key ON planner_states(owner_user_id) WHERE owner_user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at);
    `)
  }

  await schemaReadyPromise
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json")
  response.send(JSON.stringify(payload))
}

function parseJsonBody(request) {
  if (!request.body) return {}
  if (typeof request.body === "object") return request.body
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body)
    } catch {
      return {}
    }
  }
  return {}
}

function readCookies(request) {
  const header = request.headers.cookie || ""
  return header.split(";").reduce((acc, chunk) => {
    const [name, ...rest] = chunk.trim().split("=")
    if (!name) return acc
    acc[name] = decodeURIComponent(rest.join("="))
    return acc
  }, {})
}

function setSessionCookie(response, sessionId) {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`
  )
}

function clearSessionCookie(response) {
  response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`)
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validatePassword(value) {
  return typeof value === "string" && value.length >= 10
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey.toString("hex"))
    })
  })
}

async function createSession(response, userId) {
  const db = getPool()
  const sessionId = randomId("sess")
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await db.query(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`, [sessionId, userId, expiresAt])
  setSessionCookie(response, sessionId)
}

async function getCurrentUser(request) {
  const cookies = readCookies(request)
  const sessionId = cookies[SESSION_COOKIE]
  if (!sessionId) return null

  await ensureSchema()
  const db = getPool()
  const result = await db.query(
    `SELECT u.id, u.email, s.id AS session_id
     FROM user_sessions s
     JOIN user_accounts u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [sessionId]
  )

  return result.rows[0] || null
}

async function destroySession(request, response) {
  const cookies = readCookies(request)
  const sessionId = cookies[SESSION_COOKIE]
  clearSessionCookie(response)
  if (!sessionId) return
  try {
    await ensureSchema()
    await getPool().query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId])
  } catch (error) {
    console.error("Failed to destroy session", error)
  }
}

module.exports = {
  APP_VERSION,
  SESSION_COOKIE,
  getPool,
  ensureSchema,
  sendJson,
  parseJsonBody,
  normalizeEmail,
  validateEmail,
  validatePassword,
  randomId,
  hashPassword,
  createSession,
  getCurrentUser,
  destroySession,
  clearSessionCookie,
}
