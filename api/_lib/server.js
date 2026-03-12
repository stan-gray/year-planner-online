const { Pool } = require("pg")
const crypto = require("crypto")

const APP_VERSION = "4.1"
const SESSION_COOKIE = "year_planner_session"
const SESSION_TTL_DAYS = 30
const LEGACY_ANON_MODE = process.env.LEGACY_ANON_PLANNER_MODE || "readonly"

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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        server_revision BIGINT NOT NULL DEFAULT 1
      );

      ALTER TABLE planner_states ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES user_accounts(id) ON DELETE SET NULL;
      ALTER TABLE planner_states ADD COLUMN IF NOT EXISTS server_revision BIGINT NOT NULL DEFAULT 1;
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

function normalizeBaseRevision(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return parseInt(value.trim(), 10)
  return null
}

function formatPlannerRow(row) {
  if (!row) return null
  return {
    plannerId: row.planner_id,
    plannerData: row.planner_data,
    version: row.app_version,
    updatedAt: row.updated_at,
    revision: Number(row.server_revision || 1),
  }
}

async function upsertAccountPlanner({ userId, plannerData, baseRevision }) {
  const db = getPool()
  const plannerId = `acct:${userId}`
  const normalizedBaseRevision = normalizeBaseRevision(baseRevision)

  const existing = await db.query(
    `SELECT planner_id, planner_data, app_version, updated_at, server_revision
     FROM planner_states
     WHERE owner_user_id = $1
     LIMIT 1`,
    [userId]
  )

  if (existing.rowCount === 0) {
    const inserted = await db.query(
      `INSERT INTO planner_states (planner_id, owner_user_id, planner_data, app_version, server_revision)
       VALUES ($1, $2, $3::jsonb, $4, 1)
       RETURNING planner_id, planner_data, app_version, updated_at, server_revision`,
      [plannerId, userId, JSON.stringify(plannerData), APP_VERSION]
    )

    return { ok: true, created: true, record: formatPlannerRow(inserted.rows[0]) }
  }

  const currentRow = existing.rows[0]
  const currentRevision = Number(currentRow.server_revision || 1)

  if (normalizedBaseRevision === null || normalizedBaseRevision !== currentRevision) {
    return {
      ok: false,
      conflict: true,
      current: formatPlannerRow(currentRow),
    }
  }

  const updated = await db.query(
    `UPDATE planner_states
     SET planner_id = $2,
         planner_data = $3::jsonb,
         app_version = $4,
         updated_at = NOW(),
         server_revision = server_revision + 1
     WHERE owner_user_id = $1 AND server_revision = $5
     RETURNING planner_id, planner_data, app_version, updated_at, server_revision`,
    [userId, plannerId, JSON.stringify(plannerData), APP_VERSION, currentRevision]
  )

  if (updated.rowCount === 0) {
    const latest = await db.query(
      `SELECT planner_id, planner_data, app_version, updated_at, server_revision
       FROM planner_states
       WHERE owner_user_id = $1
       LIMIT 1`,
      [userId]
    )

    return {
      ok: false,
      conflict: true,
      current: formatPlannerRow(latest.rows[0]),
    }
  }

  return { ok: true, created: false, record: formatPlannerRow(updated.rows[0]) }
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
  LEGACY_ANON_MODE,
  getPool,
  ensureSchema,
  sendJson,
  parseJsonBody,
  normalizeEmail,
  validateEmail,
  validatePassword,
  normalizeBaseRevision,
  formatPlannerRow,
  randomId,
  hashPassword,
  upsertAccountPlanner,
  createSession,
  getCurrentUser,
  destroySession,
  clearSessionCookie,
}
