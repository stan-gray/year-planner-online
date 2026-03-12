const {
  ensureSchema,
  getPool,
  sendJson,
  parseJsonBody,
  validatePassword,
  hashPassword,
  randomId,
  getCurrentUser,
  deleteSessionsForUser,
  destroySession,
  createRecoveryKit,
} = require("../_lib/server")

module.exports = async (request, response) => {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Access-Control-Allow-Origin", "*")
  response.setHeader("Access-Control-Allow-Methods", "GET,PATCH,DELETE,OPTIONS")
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
      sendJson(response, 401, { error: "Sign in to manage your account." })
      return
    }

    if (request.method === "GET") {
      sendJson(response, 200, {
        ok: true,
        account: {
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          recoveryCodesGeneratedAt: user.recoveryCodesGeneratedAt,
          activeRecoveryCodes: user.activeRecoveryCodes,
          hasRecoveryKit: user.hasRecoveryKit,
        },
      })
      return
    }

    if (request.method === "PATCH") {
      const body = parseJsonBody(request)
      const action = typeof body.action === "string" ? body.action : ""

      if (action === "change-password") {
        const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : ""
        const nextPassword = typeof body.nextPassword === "string" ? body.nextPassword : ""

        if (!validatePassword(nextPassword)) {
          sendJson(response, 400, { error: "Use a new password with at least 10 characters." })
          return
        }

        const accountResult = await db.query(
          `SELECT password_hash, password_salt FROM user_accounts WHERE id = $1 LIMIT 1`,
          [user.id]
        )
        const account = accountResult.rows[0]
        const currentHash = await hashPassword(currentPassword, account.password_salt)
        if (currentHash !== account.password_hash) {
          sendJson(response, 401, { error: "Current password is incorrect." })
          return
        }

        const salt = randomId("salt")
        const passwordHash = await hashPassword(nextPassword, salt)
        await db.query(
          `UPDATE user_accounts
           SET password_hash = $2,
               password_salt = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [user.id, passwordHash, salt]
        )

        sendJson(response, 200, { ok: true, message: "Password updated." })
        return
      }

      if (action === "generate-recovery-kit") {
        const password = typeof body.password === "string" ? body.password : ""
        const accountResult = await db.query(
          `SELECT password_hash, password_salt FROM user_accounts WHERE id = $1 LIMIT 1`,
          [user.id]
        )
        const account = accountResult.rows[0]
        const currentHash = await hashPassword(password, account.password_salt)
        if (currentHash !== account.password_hash) {
          sendJson(response, 401, { error: "Confirm your password to generate new recovery codes." })
          return
        }

        const kit = createRecoveryKit()
        await db.query(
          `UPDATE user_accounts
           SET recovery_codes_json = $2::jsonb,
               recovery_codes_generated_at = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [user.id, JSON.stringify(kit.storedCodes), kit.createdAt]
        )

        sendJson(response, 200, {
          ok: true,
          message: "New recovery kit generated. Save it somewhere safe.",
          recoveryCodes: kit.rawCodes,
          recoveryCodesGeneratedAt: kit.createdAt,
          activeRecoveryCodes: kit.rawCodes.length,
        })
        return
      }

      if (action === "sign-out-other-sessions") {
        await deleteSessionsForUser(user.id, { excludeSessionId: user.sessionId })
        sendJson(response, 200, { ok: true, message: "Signed out your other sessions." })
        return
      }

      sendJson(response, 400, { error: "Unsupported account action." })
      return
    }

    if (request.method === "DELETE") {
      const body = parseJsonBody(request)
      const password = typeof body.password === "string" ? body.password : ""

      const accountResult = await db.query(
        `SELECT password_hash, password_salt FROM user_accounts WHERE id = $1 LIMIT 1`,
        [user.id]
      )
      const account = accountResult.rows[0]
      const currentHash = await hashPassword(password, account.password_salt)
      if (currentHash !== account.password_hash) {
        sendJson(response, 401, { error: "Enter your password to delete the account." })
        return
      }

      await db.query(`DELETE FROM user_accounts WHERE id = $1`, [user.id])
      await destroySession(request, response)
      sendJson(response, 200, { ok: true, message: "Account deleted." })
      return
    }

    sendJson(response, 405, { error: "Method not allowed." })
  } catch (error) {
    console.error("Account settings error", error)
    sendJson(response, 500, { error: "Could not manage your account right now." })
  }
}
