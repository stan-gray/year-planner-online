const {
  APP_VERSION,
  getPool,
  ensureSchema,
  sendJson,
  parseJsonBody,
  normalizeEmail,
  hashPassword,
  createSession,
  getCurrentUser,
  destroySession,
} = require("../_lib/server")

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (request.method === "OPTIONS") {
    response.status(204).end()
    return
  }

  try {
    await ensureSchema()
    const db = getPool()

    if (request.method === "GET") {
      const user = await getCurrentUser(request)
      if (!user) {
        sendJson(response, 200, { authenticated: false })
        return
      }

      const planner = await db.query(
        `SELECT updated_at FROM planner_states WHERE owner_user_id = $1 LIMIT 1`,
        [user.id]
      )

      sendJson(response, 200, {
        authenticated: true,
        user: { email: user.email },
        planner: planner.rowCount
          ? { updatedAt: planner.rows[0].updated_at, syncMode: "account" }
          : { updatedAt: null, syncMode: "account" },
      })
      return
    }

    if (request.method === "POST") {
      const body = parseJsonBody(request)
      const email = normalizeEmail(body.email)
      const password = typeof body.password === "string" ? body.password : ""

      const result = await db.query(
        `SELECT id, email, password_hash, password_salt FROM user_accounts WHERE email = $1 LIMIT 1`,
        [email]
      )

      if (result.rowCount === 0) {
        sendJson(response, 401, { error: "Incorrect email or password." })
        return
      }

      const user = result.rows[0]
      const attemptedHash = await hashPassword(password, user.password_salt)
      if (attemptedHash !== user.password_hash) {
        sendJson(response, 401, { error: "Incorrect email or password." })
        return
      }

      await createSession(response, user.id)
      const planner = await db.query(`SELECT updated_at FROM planner_states WHERE owner_user_id = $1 LIMIT 1`, [user.id])
      sendJson(response, 200, {
        ok: true,
        user: { email: user.email },
        planner: planner.rowCount
          ? { updatedAt: planner.rows[0].updated_at, syncMode: "account" }
          : { updatedAt: null, syncMode: "account" },
        version: APP_VERSION,
      })
      return
    }

    if (request.method === "DELETE") {
      await destroySession(request, response)
      sendJson(response, 200, { ok: true })
      return
    }

    sendJson(response, 405, { error: "Method not allowed." })
  } catch (error) {
    console.error("Session error", error)
    sendJson(response, 500, { error: "Could not access account session right now." })
  }
}
