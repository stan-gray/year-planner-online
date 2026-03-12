import React, { useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"
import {
  getAccountSession,
  loadAccountPlanner,
  registerAccount,
  RevisionConflictError,
  saveAccountPlanner,
  signIn,
  signOut,
} from "../lib/account"

type SyncPhase = "offline" | "checking" | "needs-choice" | "idle" | "saving" | "saved" | "loading" | "error"

const SaveLoadData: React.FC = () => {
  const {
    exportPlannerData,
    importPlannerData,
    replacePlannerData,
    saveSnapshots,
    createSnapshot,
    restoreSnapshot,
    resetPlanner,
    plannerData,
    markSynced,
    setSyncState,
    clearSyncState,
    hasUnsyncedChanges,
    isPlannerEmpty,
  } = useCalendar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const initializedRef = useRef(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [sessionEmail, setSessionEmail] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("checking")
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "register">("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authBusy, setAuthBusy] = useState(false)

  const cloudUpdatedAt = plannerData.sync.cloudUpdatedAt
  const cloudRevision = plannerData.sync.revision

  const storageSummary = useMemo(
    () =>
      plannerData.updatedAt
        ? `Autosaved in this browser ${formatDistanceToNow(new Date(plannerData.updatedAt), { addSuffix: true })}.`
        : "Autosaved in this browser.",
    [plannerData.updatedAt]
  )

  const cloudSummary = useMemo(() => {
    if (!isAuthenticated) return "You can stay local-only, or sign in if you want a server-backed copy across devices."
    if (!cloudUpdatedAt) return "Your account is connected, but no cloud revision exists yet."
    const updated = formatDistanceToNow(new Date(cloudUpdatedAt), { addSuffix: true })
    return `Cloud revision ${cloudRevision ?? 1} updated ${updated}.`
  }, [cloudRevision, cloudUpdatedAt, isAuthenticated])

  const syncLabel = useMemo(() => {
    switch (syncPhase) {
      case "checking":
        return "Checking account session…"
      case "needs-choice":
        return "Review which copy should win"
      case "saving":
        return "Saving to cloud…"
      case "saved":
        return "Cloud saved"
      case "loading":
        return "Loading cloud planner…"
      case "error":
        return "Cloud sync needs attention"
      case "idle":
        return autoSyncEnabled ? "Auto-sync is on" : "Signed in, sync paused"
      case "offline":
      default:
        return "Local-only mode"
    }
  }, [autoSyncEnabled, syncPhase])

  const handleRemoteLoaded = (result: Awaited<ReturnType<typeof loadAccountPlanner>>, emailForSync: string) => {
    replacePlannerData({
      ...result.plannerData,
      sync: {
        accountEmail: emailForSync,
        revision: result.revision,
        cloudUpdatedAt: result.updatedAt,
        lastSyncedLocalUpdatedAt: result.plannerData.updatedAt,
      },
    })
    setSessionEmail(emailForSync)
  }

  const refreshSession = async () => {
    setSyncPhase("checking")
    try {
      const session = await getAccountSession()
      const authenticated = Boolean(session.authenticated && session.user?.email)
      setIsAuthenticated(authenticated)
      setSessionEmail(session.user?.email || "")

      if (!authenticated) {
        setAutoSyncEnabled(false)
        setSyncPhase("offline")
        return
      }

      const serverRevision = session.planner?.revision ?? null
      const serverUpdatedAt = session.planner?.updatedAt || ""
      const localRevision = plannerData.sync.accountEmail === session.user?.email ? plannerData.sync.revision : null
      const sameRevision = serverRevision !== null && localRevision === serverRevision

      setSyncState({
        accountEmail: session.user?.email || "",
        revision: sameRevision ? serverRevision : plannerData.sync.revision,
        cloudUpdatedAt: serverUpdatedAt || plannerData.sync.cloudUpdatedAt,
      })

      if (!serverRevision) {
        setAutoSyncEnabled(true)
        setSyncPhase("idle")
        return
      }

      if (!plannerData.sync.accountEmail && isPlannerEmpty) {
        const result = await loadAccountPlanner()
        handleRemoteLoaded(result, session.user?.email || "")
        setAutoSyncEnabled(true)
        setSyncPhase("saved")
        setStatusMessage("Loaded your existing cloud planner into this browser.")
        return
      }

      if (sameRevision) {
        setAutoSyncEnabled(true)
        setSyncPhase("idle")
        return
      }

      if (!hasUnsyncedChanges) {
        const result = await loadAccountPlanner()
        handleRemoteLoaded(result, session.user?.email || "")
        setAutoSyncEnabled(true)
        setSyncPhase("saved")
        setStatusMessage("This browser was behind, so it quietly adopted the latest cloud revision.")
        return
      }

      setAutoSyncEnabled(false)
      setSyncPhase("needs-choice")
      setStatusMessage("This browser has unsynced edits and the cloud changed elsewhere. Pick which copy becomes the source of truth.")
    } catch (error) {
      setSyncPhase("error")
      setStatusMessage(error instanceof Error ? error.message : "Could not check account session.")
    }
  }

  useEffect(() => {
    refreshSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      return
    }

    if (!isAuthenticated || !autoSyncEnabled || !plannerData.sync.accountEmail || !hasUnsyncedChanges) return

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    setSyncPhase("saving")
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        const result = await saveAccountPlanner(plannerData, plannerData.sync.revision)
        markSynced({
          accountEmail: plannerData.sync.accountEmail,
          revision: result.revision,
          cloudUpdatedAt: result.updatedAt,
        })
        setSyncPhase("saved")
      } catch (error) {
        if (error instanceof RevisionConflictError) {
          if (error.current && plannerData.sync.accountEmail) {
            setSyncState({ revision: error.current.revision, cloudUpdatedAt: error.current.updatedAt })
          }
          setAutoSyncEnabled(false)
          setSyncPhase("needs-choice")
          setStatusMessage(error.message)
          return
        }

        setSyncPhase("error")
        setStatusMessage(error instanceof Error ? error.message : "Could not save planner to cloud.")
      }
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [autoSyncEnabled, hasUnsyncedChanges, isAuthenticated, markSynced, plannerData, setSyncState])

  const handleDownload = () => {
    const blob = new Blob([exportPlannerData()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `year-planner-${plannerData.selectedYear}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setStatusMessage("Downloaded a full planner backup.")
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result
      if (typeof result !== "string") return
      const response = importPlannerData(result)
      setStatusMessage(response.message)
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const pushLocalToCloud = async (forceMessage?: string) => {
    setSyncPhase("saving")
    try {
      const result = await saveAccountPlanner(plannerData, plannerData.sync.revision)
      markSynced({
        accountEmail: sessionEmail || plannerData.sync.accountEmail,
        revision: result.revision,
        cloudUpdatedAt: result.updatedAt,
      })
      setAutoSyncEnabled(true)
      setSyncPhase("saved")
      setStatusMessage(forceMessage || "This browser copy is now the cloud source of truth.")
    } catch (error) {
      if (error instanceof RevisionConflictError) {
        if (error.current) {
          setSyncState({ revision: error.current.revision, cloudUpdatedAt: error.current.updatedAt })
        }
        setAutoSyncEnabled(false)
        setSyncPhase("needs-choice")
        setStatusMessage(error.message)
        return
      }
      setSyncPhase("error")
      setStatusMessage(error instanceof Error ? error.message : "Could not save planner to cloud.")
    }
  }

  const pullCloudToLocal = async (forceMessage?: string) => {
    setSyncPhase("loading")
    try {
      const result = await loadAccountPlanner()
      handleRemoteLoaded(result, sessionEmail || plannerData.sync.accountEmail)
      setAutoSyncEnabled(true)
      setSyncPhase("saved")
      setStatusMessage(forceMessage || "Loaded the cloud planner into this browser.")
    } catch (error) {
      setSyncPhase("error")
      setStatusMessage(error instanceof Error ? error.message : "Could not load planner from cloud.")
    }
  }

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setAuthBusy(true)
    setStatusMessage("")

    try {
      if (authMode === "register") {
        const session = await registerAccount(email, password, plannerData)
        const nextEmail = session.user?.email || email
        setIsAuthenticated(true)
        setSessionEmail(nextEmail)
        markSynced({
          accountEmail: nextEmail,
          revision: session.planner?.revision ?? 1,
          cloudUpdatedAt: session.planner?.updatedAt || new Date().toISOString(),
        })
        setAutoSyncEnabled(true)
        setSyncPhase("saved")
        setStatusMessage("Account created. This browser planner is now claimed by your account and ready to sync.")
      } else {
        const session = await signIn(email, password)
        setIsAuthenticated(true)
        setSessionEmail(session.user?.email || email)

        const serverRevision = session.planner?.revision ?? null
        const localRevision = plannerData.sync.accountEmail === (session.user?.email || email) ? plannerData.sync.revision : null

        if (!serverRevision) {
          setSyncState({ accountEmail: session.user?.email || email })
          setAutoSyncEnabled(true)
          setSyncPhase("idle")
          setStatusMessage("Signed in. Cloud sync is ready whenever you want it.")
        } else if (!plannerData.sync.accountEmail && isPlannerEmpty) {
          await pullCloudToLocal("Signed in and loaded your existing cloud planner.")
        } else if (localRevision === serverRevision) {
          setAutoSyncEnabled(true)
          setSyncPhase("idle")
          setStatusMessage("Signed in. This browser already matches the latest cloud revision.")
        } else if (hasUnsyncedChanges) {
          setSyncState({ accountEmail: session.user?.email || email, revision: serverRevision, cloudUpdatedAt: session.planner?.updatedAt || "" })
          setAutoSyncEnabled(false)
          setSyncPhase("needs-choice")
          setStatusMessage("Signed in. This browser has unsynced edits, so choose whether to keep local changes or load the cloud copy.")
        } else {
          await pullCloudToLocal("Signed in and loaded the latest cloud revision.")
        }
      }

      setPassword("")
    } catch (error) {
      setSyncPhase("error")
      setStatusMessage(error instanceof Error ? error.message : "Could not access your account.")
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsAuthenticated(false)
      setSessionEmail("")
      setAutoSyncEnabled(false)
      clearSyncState()
      setSyncPhase("offline")
      setStatusMessage("Signed out. This browser still keeps its local planner copy.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not sign out.")
    }
  }

  return (
    <section className="panel save-panel">
      <div className="panel-heading-row save-header-stack">
        <div>
          <p className="section-kicker">Backup & sync</p>
          <h2>Keep local speed, add calmer account-backed sync</h2>
        </div>
        <div className={`sync-pill sync-${syncPhase}`}>
          <span className="sync-dot" />
          {syncLabel}
        </div>
      </div>

      <div className="save-grid account-grid">
        <div className="summary-card auth-card">
          <strong>Identity & ownership</strong>
          {isAuthenticated ? (
            <>
              <p>
                Signed in as <strong>{sessionEmail}</strong>. The browser stays fast, while the server keeps the authoritative cloud
                revision for your account. No database secrets ever reach the client.
              </p>
              <div className="action-row wrap">
                <button className="primary-button" onClick={() => pushLocalToCloud()}>
                  Save this browser copy to cloud
                </button>
                <button className="ghost-button" onClick={() => pullCloudToLocal()}>
                  Load cloud into this browser
                </button>
                <button className="ghost-button" onClick={() => setAutoSyncEnabled((current) => !current)}>
                  {autoSyncEnabled ? "Pause auto-sync" : "Resume auto-sync"}
                </button>
                <button className="ghost-button danger" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Stay local if you want. If you want cross-device continuity, create a lightweight account and claim one personal
                planner with email, password, and a server-side session cookie.
              </p>
              <div className="segmented-control auth-mode-toggle">
                <button className={`segment${authMode === "register" ? " active" : ""}`} onClick={() => setAuthMode("register")}>
                  Create account
                </button>
                <button className={`segment${authMode === "signin" ? " active" : ""}`} onClick={() => setAuthMode("signin")}>
                  Sign in
                </button>
              </div>
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={authMode === "register" ? "Use at least 10 characters" : "Password"}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  required
                />
                <button className="primary-button" type="submit" disabled={authBusy}>
                  {authBusy ? "Working…" : authMode === "register" ? "Create account & claim this planner" : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="summary-card">
          <strong>Sync state</strong>
          <p>{storageSummary}</p>
          <p>{cloudSummary}</p>
          <p>
            Local edits always save immediately in this browser. Cloud sync only layers on top, so the app stays usable offline
            and doesn&apos;t panic over timestamps alone.
          </p>
          {isAuthenticated ? (
            <p className="mini-note">
              {hasUnsyncedChanges
                ? "This browser has local edits that haven’t reached the cloud yet."
                : "This browser is in step with the latest known cloud revision."}
            </p>
          ) : null}
          {syncPhase === "needs-choice" ? (
            <div className="choice-card">
              <strong>Before auto-sync resumes, choose your source of truth</strong>
              <p>
                The app detected a real revision mismatch, not just a clock difference. Pick the copy you trust, then auto-sync
                will continue from there.
              </p>
              <div className="action-row wrap">
                <button className="primary-button" onClick={() => pullCloudToLocal("Loaded the latest cloud revision here.")}>
                  Use cloud planner here
                </button>
                <button className="ghost-button" onClick={() => pushLocalToCloud("This browser copy replaced the older cloud revision.")}>
                  Keep this browser copy
                </button>
              </div>
            </div>
          ) : null}
          {statusMessage ? <p className={syncPhase === "error" ? "error-text" : "success-text"}>{statusMessage}</p> : null}
        </div>

        <div className="summary-card">
          <strong>Manual safety nets</strong>
          <p>Use exports and snapshots for recoverable milestones, experiments, or peace of mind.</p>
          <div className="action-row wrap">
            <button className="primary-button" onClick={handleDownload}>
              Export JSON backup
            </button>
            <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
              Import backup
            </button>
            <button className="ghost-button" onClick={() => createSnapshot()}>
              Save browser snapshot
            </button>
            <button
              className="ghost-button danger"
              onClick={() => {
                if (window.confirm("Reset everything in this browser? Export a backup first if you might need it.")) {
                  resetPlanner()
                  setStatusMessage("Planner reset for this browser.")
                }
              }}
            >
              Reset browser copy
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileChange} />
        </div>
      </div>

      <div className="summary-card snapshots-card">
        <strong>Browser snapshots</strong>
        {saveSnapshots.length ? (
          <div className="snapshot-list">
            {saveSnapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                className="snapshot-item"
                onClick={() => {
                  restoreSnapshot(snapshot.id)
                  setStatusMessage(`Restored snapshot: ${snapshot.label}`)
                }}
              >
                <span>{snapshot.label}</span>
                <small>{formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}</small>
              </button>
            ))}
          </div>
        ) : (
          <p>No snapshots yet. Create one before major edits or experiments.</p>
        )}
      </div>

      <p className="footer-note">
        Best default: let browser autosave handle day-to-day editing, use account sync for continuity, and keep occasional JSON
        exports for portable backups you control.
      </p>
    </section>
  )
}

export default SaveLoadData
