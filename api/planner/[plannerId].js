const { APP_VERSION, ensureSchema, getPool, sendJson, parseJsonBody, LEGACY_ANON_MODE, formatPlannerRow } = require("../_lib/server")

const MAX_ID_LENGTH = 128

function normalizePlannerId(value) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_ID_LENGTH)
}

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")
  response.setHeader("X-Year-Planner-Legacy-Route", "deprecated")

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
        `SELECT planner_id, planner_data, app_version, updated_at, server_revision, owner_user_id FROM planner_states WHERE planner_id = $1 LIMIT 1`,
        [plannerId]
      )

      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "Planner not found." })
        return
      }

      const row = result.rows[0]
      if (row.owner_user_id) {
        sendJson(response, 403, { error: "This planner now belongs to an account. Sign in through the main app to access it." })
        return
      }

      sendJson(response, 200, {
        ...formatPlannerRow(row),
        legacy: true,
        deprecated: true,
      })
      return
    }

    if (request.method === "PUT") {
      const body = parseJsonBody(request)
      const plannerData = body.plannerData

      if (!plannerData || typeof plannerData !== "object" || Array.isArray(plannerData)) {
        sendJson(response, 400, { error: "plannerData must be a JSON object." })
        return
      }

      if (LEGACY_ANON_MODE !== "write") {
        sendJson(response, 410, {
          error: "Anonymous planner writes are deprecated. Create an account and use /api/planner/account instead.",
          code: "LEGACY_ROUTE_READONLY",
        })
        return
      }

      const existing = await db.query(`SELECT owner_user_id FROM planner_states WHERE planner_id = $1 LIMIT 1`, [plannerId])
      if (existing.rowCount > 0 && existing.rows[0].owner_user_id) {
        sendJson(response, 403, { error: "This planner now belongs to an account and can no longer be overwritten anonymously." })
        return
      }

      const result = await db.query(
        `INSERT INTO planner_states (planner_id, planner_data, app_version, server_revision)
         VALUES ($1, $2::jsonb, $3, 1)
         ON CONFLICT (planner_id)
         DO UPDATE SET planner_data = EXCLUDED.planner_data, app_version = EXCLUDED.app_version, updated_at = NOW(), server_revision = planner_states.server_revision + 1
         WHERE planner_states.owner_user_id IS NULL
         RETURNING planner_id, planner_data, app_version, updated_at, server_revision`,
        [plannerId, JSON.stringify(plannerData), APP_VERSION]
      )

      if (result.rowCount === 0) {
        sendJson(response, 403, { error: "This planner now belongs to an account and can no longer be overwritten anonymously." })
        return
      }

      sendJson(response, 200, {
        ok: true,
        ...formatPlannerRow(result.rows[0]),
        legacy: true,
        deprecated: true,
      })
      return
    }

    sendJson(response, 405, { error: "Method not allowed." })
  } catch (error) {
    console.error("Planner API error", error)
    sendJson(response, 500, { error: "Unable to access planner storage right now." })
  }
}
