const {
  ensureSchema,
  getPool,
  sendJson,
  parseJsonBody,
  normalizeEmail,
  validateEmail,
  validatePassword,
  randomId,
  hashPassword,
  hashRecoveryCode,
  createSession,
  deleteSessionsForUser,
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
    const recoveryCode = typeof body.recoveryCode === "string" ? body.recoveryCode.trim().toUpperCase() : ""
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : ""

    if (!validateEmail(email)) {
      sendJson(response, 400, { error: "Enter the email on your account." })
      return
    }

    if (!recoveryCode) {
      sendJson(response, 400, { error: "Enter one of your recovery codes." })
      return
    }

    if (!validatePassword(newPassword)) {
      sendJson(response, 400, { error: "Use a new password with at least 10 characters." })
      return
    }

    const result = await db.query(
      `SELECT id, email, recovery_codes_json FROM user_accounts WHERE email = $1 LIMIT 1`,
      [email]
    )

    if (result.rowCount === 0) {
      sendJson(response, 404, { error: "No account matches that email." })
      return
    }

    const user = result.rows[0]
    const hashedCode = hashRecoveryCode(recoveryCode)
    const recoveryCodes = Array.isArray(user.recovery_codes_json) ? user.recovery_codes_json : []
    const matchIndex = recoveryCodes.findIndex((entry) => entry && !entry.usedAt && entry.hash === hashedCode)

    if (matchIndex === -1) {
      sendJson(response, 401, { error: "That recovery code is invalid or already used." })
      return
    }

    const nextRecoveryCodes = recoveryCodes.map((entry, index) =>
      index === matchIndex
        ? {
            ...entry,
            usedAt: new Date().toISOString(),
          }
        : entry
    )

    const salt = randomId("salt")
    const passwordHash = await hashPassword(newPassword, salt)

    await db.query(
      `UPDATE user_accounts
       SET password_hash = $2,
           password_salt = $3,
           recovery_codes_json = $4::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id, passwordHash, salt, JSON.stringify(nextRecoveryCodes)]
    )

    await deleteSessionsForUser(user.id)
    await createSession(response, user.id)

    sendJson(response, 200, {
      ok: true,
      authenticated: true,
      user: {
        email: user.email,
        activeRecoveryCodes: nextRecoveryCodes.filter((entry) => entry && !entry.usedAt).length,
        hasRecoveryKit: nextRecoveryCodes.some((entry) => entry && !entry.usedAt),
      },
      message: "Password reset complete. That recovery code can’t be used again.",
    })
  } catch (error) {
    console.error("Recovery error", error)
    sendJson(response, 500, { error: "Could not recover that account right now." })
  }
}
