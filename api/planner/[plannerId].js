const { Pool } = require("pg")

const MAX_ID_LENGTH = 128
const APP_VERSION = "3.1"

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
      CREATE TABLE IF NOT EXISTS planner_states (
        planner_id TEXT PRIMARY KEY,
        planner_data JSONB NOT NULL,
        app_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
  }

  await schemaReadyPromise
}

function normalizePlannerId(value) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_ID_LENGTH)
}

function sendJson(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json")
  response.send(JSON.stringify(payload))
}

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (request.method === "OPTIONS") {
    response.status(204).end()
    return
  }

  const plannerId = normalizePlannerId(request.query.plannerId)
  if (!plannerId) {
    sendJson(response, 400, { error: "Missing planner id." })
    return
  }

  try {
    await ensureSchema()
    const db = getPool()

    if (request.method === "GET") {
      const result = await db.query(
        `SELECT planner_id, planner_data, app_version, updated_at FROM planner_states WHERE planner_id = $1 LIMIT 1`,
        [plannerId]
      )

      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "Planner not found." })
        return
      }

      const row = result.rows[0]
      sendJson(response, 200, {
        plannerId: row.planner_id,
        plannerData: row.planner_data,
        version: row.app_version,
        updatedAt: row.updated_at,
      })
      return
    }

    if (request.method === "PUT") {
      const plannerData = request.body && typeof request.body === "object" ? request.body.plannerData : null

      if (!plannerData || typeof plannerData !== "object" || Array.isArray(plannerData)) {
        sendJson(response, 400, { error: "plannerData must be a JSON object." })
        return
      }

      const result = await db.query(
        `INSERT INTO planner_states (planner_id, planner_data, app_version)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (planner_id)
         DO UPDATE SET planner_data = EXCLUDED.planner_data, app_version = EXCLUDED.app_version, updated_at = NOW()
         RETURNING planner_id, planner_data, app_version, updated_at`,
        [plannerId, JSON.stringify(plannerData), APP_VERSION]
      )

      const row = result.rows[0]
      sendJson(response, 200, {
        ok: true,
        plannerId: row.planner_id,
        plannerData: row.planner_data,
        version: row.app_version,
        updatedAt: row.updated_at,
      })
      return
    }

    sendJson(response, 405, { error: "Method not allowed." })
  } catch (error) {
    console.error("Planner API error", error)
    sendJson(response, 500, { error: "Unable to access planner storage right now." })
  }
}
