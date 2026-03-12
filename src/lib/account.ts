import { PlannerData } from "../contexts/CalendarContext"

export interface AccountUser {
  email: string
  createdAt?: string
  recoveryCodesGeneratedAt?: string | null
  activeRecoveryCodes?: number
  hasRecoveryKit?: boolean
}

export interface AccountSession {
  authenticated: boolean
  user?: AccountUser
  planner?: { updatedAt: string | null; revision: number | null; syncMode: "account" }
}

export interface RemotePlannerRecord {
  plannerId: string
  plannerData: PlannerData
  updatedAt: string
  revision: number
  version?: string
}

export interface AccountSettings {
  email: string
  createdAt?: string
  updatedAt?: string
  recoveryCodesGeneratedAt?: string | null
  activeRecoveryCodes?: number
  hasRecoveryKit?: boolean
}

export class RevisionConflictError extends Error {
  current?: RemotePlannerRecord

  constructor(message: string, current?: RemotePlannerRecord) {
    super(message)
    this.name = "RevisionConflictError"
    this.current = current
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null)
}

export async function getAccountSession(): Promise<AccountSession> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

  const payload = await readJson<AccountSession & { error?: string }>(response)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not read account session.")
  }

  return payload
}

export async function registerAccount(email: string, password: string, plannerData: PlannerData): Promise<AccountSession> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, plannerData }),
  })

  const payload = await readJson<(AccountSession & { error?: string; planner?: RemotePlannerRecord }) | null>(response)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not create account.")
  }

  return {
    authenticated: true,
    user: payload.user,
    planner: payload.planner
      ? { updatedAt: payload.planner.updatedAt, revision: payload.planner.revision, syncMode: "account" }
      : { updatedAt: null, revision: null, syncMode: "account" },
  }
}

export async function signIn(email: string, password: string): Promise<AccountSession> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const payload = await readJson<AccountSession & { error?: string }>(response)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not sign in.")
  }

  return payload
}

export async function recoverAccount(email: string, recoveryCode: string, newPassword: string): Promise<AccountSession> {
  const response = await fetch("/api/auth/recover", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, recoveryCode, newPassword }),
  })

  const payload = await readJson<AccountSession & { error?: string }>(response)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not recover account.")
  }

  return payload
}

export async function signOut(): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  })

  if (!response.ok) {
    const payload = await readJson<{ error?: string }>(response)
    throw new Error(payload?.error || "Could not sign out.")
  }
}

export async function getAccountSettings(): Promise<AccountSettings> {
  const response = await fetch("/api/account/settings", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

  const payload = await readJson<{ ok: true; account: AccountSettings; error?: string }>(response)
  if (!response.ok || !payload?.account) {
    throw new Error(payload?.error || "Could not load account settings.")
  }

  return payload.account
}

export async function changePassword(currentPassword: string, nextPassword: string): Promise<string> {
  const response = await fetch("/api/account/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "change-password", currentPassword, nextPassword }),
  })

  const payload = await readJson<{ ok?: boolean; message?: string; error?: string }>(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Could not change password.")
  }

  return payload.message || "Password updated."
}

export async function generateRecoveryKit(password: string): Promise<{
  message: string
  recoveryCodes: string[]
  recoveryCodesGeneratedAt: string
  activeRecoveryCodes: number
}> {
  const response = await fetch("/api/account/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate-recovery-kit", password }),
  })

  const payload = await readJson<{
    ok?: boolean
    message?: string
    recoveryCodes?: string[]
    recoveryCodesGeneratedAt?: string
    activeRecoveryCodes?: number
    error?: string
  }>(response)
  if (!response.ok || !payload?.ok || !payload.recoveryCodes || !payload.recoveryCodesGeneratedAt) {
    throw new Error(payload?.error || "Could not generate recovery kit.")
  }

  return {
    message: payload.message || "Recovery kit generated.",
    recoveryCodes: payload.recoveryCodes,
    recoveryCodesGeneratedAt: payload.recoveryCodesGeneratedAt,
    activeRecoveryCodes: payload.activeRecoveryCodes || payload.recoveryCodes.length,
  }
}

export async function signOutOtherSessions(): Promise<string> {
  const response = await fetch("/api/account/settings", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "sign-out-other-sessions" }),
  })

  const payload = await readJson<{ ok?: boolean; message?: string; error?: string }>(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Could not sign out other sessions.")
  }

  return payload.message || "Signed out other sessions."
}

export async function deleteAccount(password: string): Promise<string> {
  const response = await fetch("/api/account/settings", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })

  const payload = await readJson<{ ok?: boolean; message?: string; error?: string }>(response)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Could not delete account.")
  }

  return payload.message || "Account deleted."
}

export async function saveAccountPlanner(plannerData: PlannerData, baseRevision: number | null): Promise<RemotePlannerRecord> {
  const response = await fetch("/api/planner/account", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plannerData, baseRevision }),
  })

  const payload = await readJson<(RemotePlannerRecord & { error?: string; code?: string; current?: RemotePlannerRecord }) | null>(
    response
  )
  if (response.status === 409) {
    throw new RevisionConflictError(
      payload?.error || "Cloud planner changed elsewhere. Review the latest cloud copy before overwriting it.",
      payload?.current
    )
  }
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not save cloud planner.")
  }

  return payload
}

export async function loadAccountPlanner(): Promise<RemotePlannerRecord> {
  const response = await fetch("/api/planner/account", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })

  const payload = await readJson<RemotePlannerRecord & { error?: string }>(response)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not load cloud planner.")
  }

  return payload
}
