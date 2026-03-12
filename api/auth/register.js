const {
  APP_VERSION,
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
} = require("../_lib/server")

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (request.method === "OPTIONS") {
    response.status(204).end()
    return
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." })
    return
  }

  try {
    await ensureSchema()
    const db = getPool()
    const body = parseJsonBody(request)
    const email = normalizeEmail(body.email)
    const password = typeof body.password === "string" ? body.password : ""
    const plannerData = body.plannerData && typeof body.plannerData === "object" && !Array.isArray(body.plannerData) ? body.plannerData : null

    if (!validateEmail(email)) {
      sendJson(response, 400, { error: "Enter a valid email address." })
      return
    }

    if (!validatePassword(password)) {
      sendJson(response, 400, { error: "Use a password with at least 10 characters." })
      return
    }

    const existing = await db.query(`SELECT id FROM user_accounts WHERE email = $1 LIMIT 1`, [email])
    if (existing.rowCount > 0) {
      sendJson(response, 409, { error: "That email already has an account. Sign in instead." })
      return
    }

    const userId = randomId("usr")
    const salt = randomId("salt")
    const passwordHash = await hashPassword(password, salt)

    await db.query(
      `INSERT INTO user_accounts (id, email, password_hash, password_salt) VALUES ($1, $2, $3, $4)`,
      [userId, email, passwordHash, salt]
    )

    if (plannerData) {
      await db.query(
        `INSERT INTO planner_states (planner_id, owner_user_id, planner_data, app_version)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (owner_user_id)
         WHERE owner_user_id IS NOT NULL
         DO UPDATE SET planner_data = EXCLUDED.planner_data, app_version = EXCLUDED.app_version, updated_at = NOW()
         RETURNING updated_at`,
        [`acct:${userId}`, userId, JSON.stringify(plannerData), APP_VERSION]
      )
    }

    await createSession(response, userId)
    sendJson(response, 201, {
      ok: true,
      user: { email },
      hasRemotePlanner: Boolean(plannerData),
    })
  } catch (error) {
    console.error("Register error", error)
    sendJson(response, 500, { error: "Could not create account right now." })
  }
}
