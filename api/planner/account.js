const {
  ensureSchema,
  sendJson,
  getCurrentUser,
  parseJsonBody,
  getPool,
  formatPlannerRow,
  upsertAccountPlanner,
} = require("../_lib/server")

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
        `SELECT planner_id, planner_data, app_version, updated_at, server_revision
         FROM planner_states
         WHERE owner_user_id = $1
         LIMIT 1`,
        [user.id]
      )

      if (result.rowCount === 0) {
        sendJson(response, 404, { error: "No cloud planner found for this account yet." })
        return
      }

      sendJson(response, 200, formatPlannerRow(result.rows[0]))
      return
    }

    if (request.method === "PUT") {
      const body = parseJsonBody(request)
      const plannerData = body.plannerData
      if (!plannerData || typeof plannerData !== "object" || Array.isArray(plannerData)) {
        sendJson(response, 400, { error: "plannerData must be a JSON object." })
        return
      }

      const result = await upsertAccountPlanner({
        userId: user.id,
        plannerData,
        baseRevision: body.baseRevision,
      })

      if (!result.ok) {
        sendJson(response, 409, {
          error: "Cloud planner changed somewhere else. Review the latest cloud copy before overwriting it.",
          code: "REVISION_CONFLICT",
          current: result.current,
        })
        return
      }

      sendJson(response, 200, {
        ok: true,
        ...result.record,
      })
      return
    }

    sendJson(response, 405, { error: "Method not allowed." })
  } catch (error) {
    console.error("Account planner error", error)
    sendJson(response, 500, { error: "Unable to access planner storage right now." })
  }
}
