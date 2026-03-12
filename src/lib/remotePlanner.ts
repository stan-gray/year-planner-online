import { PlannerData } from "../contexts/CalendarContext"

const REMOTE_PLANNER_ID_KEY = "year_planner_remote_id_v1"

export interface RemotePlannerRecord {
  plannerId: string
  plannerData: PlannerData
  updatedAt: string
  version?: string
}

const isBrowser = typeof window !== "undefined"

export const getRemotePlannerId = (): string => {
  if (!isBrowser) return "default"

  const existing = window.localStorage.getItem(REMOTE_PLANNER_ID_KEY)
  if (existing) return existing

  const nextId = window.crypto?.randomUUID?.() || `planner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(REMOTE_PLANNER_ID_KEY, nextId)
  return nextId
}

const getEndpoint = (plannerId: string) => `/api/planner/${encodeURIComponent(plannerId)}`

export const savePlannerRemotely = async (plannerId: string, plannerData: PlannerData): Promise<RemotePlannerRecord> => {
  const response = await fetch(getEndpoint(plannerId), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plannerData }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not save planner online.")
  }

  return payload as RemotePlannerRecord
}

export const loadPlannerRemotely = async (plannerId: string): Promise<RemotePlannerRecord> => {
  const response = await fetch(getEndpoint(plannerId), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    throw new Error(payload?.error || "Could not load planner online.")
  }

  return payload as RemotePlannerRecord
}
