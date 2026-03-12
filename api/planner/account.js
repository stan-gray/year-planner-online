const { APP_VERSION, getPool, ensureSchema, sendJson, getCurrentUser, parseJsonBody } = require("../_lib/server")

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (request.method === "OPTIONS") {
    response.status(204).end()
    return
  }

  try {
    await ensureSchema()
    const db = getPool()
    const user = await getCurrentUser(request)

    if (!user) {
      sendJson(response, 401, { error: "Sign in to access your planner." })
      return
    }

    if (request.method === "GET") {
      const result = await db.query(
        `SELECT planner_id, planner_data, app_version, updated_at
         FROM planner_states
         WHERE owner_user_id = $1
         LIMIT 1`,
        [user.id]
      )

      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "No cloud planner found for this account yet." })
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
      const body = parseJsonBody(request)
      const plannerData = body.plannerData
      if (!plannerData || typeof plannerData !== "object" || Array.isArray(plannerData)) {
        sendJson(response, 400, { error: "plannerData must be a JSON object." })
        return
      }

      const plannerId = `acct:${user.id}`
      const result = await db.query(
        `INSERT INTO planner_states (planner_id, owner_user_id, planner_data, app_version)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (owner_user_id)
         WHERE owner_user_id IS NOT NULL
         DO UPDATE SET planner_id = EXCLUDED.planner_id, planner_data = EXCLUDED.planner_data, app_version = EXCLUDED.app_version, updated_at = NOW()
         RETURNING planner_id, planner_data, app_version, updated_at`,
        [plannerId, user.id, JSON.stringify(plannerData), APP_VERSION]
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
    console.error("Account planner error", error)
    sendJson(response, 500, { error: "Unable to access planner storage right now." })
  }
}
