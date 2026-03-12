import React, { useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"
import { getAccountSession, loadAccountPlanner, registerAccount, saveAccountPlanner, signIn, signOut } from "../lib/account"

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
  } = useCalendar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const initializedRef = useRef(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string>("")
  const [sessionEmail, setSessionEmail] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("checking")
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "register">("register")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authBusy, setAuthBusy] = useState(false)

  const storageSummary = useMemo(
    () =>
      plannerData.updatedAt
        ? `Autosaved in this browser ${formatDistanceToNow(new Date(plannerData.updatedAt), { addSuffix: true })}.`
        : "Autosaved in this browser.",
    [plannerData.updatedAt]
  )

  const cloudSummary = useMemo(() => {
    if (!isAuthenticated) return "Sign in to connect this browser to a real account-backed cloud planner."
    if (!cloudUpdatedAt) return "Your account is connected, but nothing has been saved to the cloud yet."
    return `Cloud planner updated ${formatDistanceToNow(new Date(cloudUpdatedAt), { addSuffix: true })}.`
  }, [cloudUpdatedAt, isAuthenticated])

  const syncLabel = useMemo(() => {
    switch (syncPhase) {
      case "checking":
        return "Checking account session…"
      case "needs-choice":
        return "Choose whether to load cloud data or keep this browser copy"
      case "saving":
        return "Saving to cloud…"
      case "saved":
        return "All changes saved to cloud"
      case "loading":
        return "Loading cloud planner…"
      case "error":
        return "Cloud sync needs attention"
      case "idle":
        return autoSyncEnabled ? "Auto-sync is on" : "Signed in, waiting for your sync choice"
      case "offline":
      default:
        return "Local-only mode"
    }
  }, [autoSyncEnabled, syncPhase])

  const refreshSession = async () => {
    setSyncPhase("checking")
    try {
      const session = await getAccountSession()
      const authenticated = Boolean(session.authenticated && session.user?.email)
      setIsAuthenticated(authenticated)
      setSessionEmail(session.user?.email || "")
      setCloudUpdatedAt(session.planner?.updatedAt || "")

      if (!authenticated) {
        setAutoSyncEnabled(false)
        setSyncPhase("offline")
        return
      }

      if (session.planner?.updatedAt && session.planner.updatedAt !== plannerData.updatedAt) {
        setAutoSyncEnabled(false)
        setSyncPhase("needs-choice")
      } else {
        setAutoSyncEnabled(true)
        setSyncPhase("idle")
      }
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

    if (!isAuthenticated || !autoSyncEnabled) return

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    setSyncPhase("saving")
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        const result = await saveAccountPlanner(plannerData)
        setCloudUpdatedAt(result.updatedAt)
        setSyncPhase("saved")
      } catch (error) {
        setSyncPhase("error")
        setStatusMessage(error instanceof Error ? error.message : "Could not save planner to cloud.")
      }
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [autoSyncEnabled, isAuthenticated, plannerData])

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

  const pushLocalToCloud = async () => {
    setSyncPhase("saving")
    try {
      const result = await saveAccountPlanner(plannerData)
      setCloudUpdatedAt(result.updatedAt)
      setAutoSyncEnabled(true)
      setSyncPhase("saved")
      setStatusMessage("This browser copy is now the cloud source of truth.")
    } catch (error) {
      setSyncPhase("error")
      setStatusMessage(error instanceof Error ? error.message : "Could not save planner to cloud.")
    }
  }

  const pullCloudToLocal = async () => {
    setSyncPhase("loading")
    try {
      const result = await loadAccountPlanner()
      replacePlannerData(result.plannerData)
      setCloudUpdatedAt(result.updatedAt)
      setAutoSyncEnabled(true)
      setSyncPhase("saved")
      setStatusMessage("Loaded the cloud planner into this browser.")
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
        setIsAuthenticated(true)
        setSessionEmail(session.user?.email || email)
        setCloudUpdatedAt(new Date().toISOString())
        setAutoSyncEnabled(true)
        setSyncPhase("saved")
        setStatusMessage("Account created. Your current browser planner was claimed and saved to your account.")
      } else {
        const session = await signIn(email, password)
        setIsAuthenticated(true)
        setSessionEmail(session.user?.email || email)
        setCloudUpdatedAt(session.planner?.updatedAt || "")
        if (session.planner?.updatedAt && session.planner.updatedAt !== plannerData.updatedAt) {
          setAutoSyncEnabled(false)
          setSyncPhase("needs-choice")
          setStatusMessage("Signed in. Choose whether to load the cloud planner or keep what is currently in this browser.")
        } else {
          setAutoSyncEnabled(true)
          setSyncPhase("idle")
          setStatusMessage("Signed in. Auto-sync is ready.")
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
      setCloudUpdatedAt("")
      setAutoSyncEnabled(false)
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
          <h2>Keep local speed, add real account-backed cloud save</h2>
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
                Signed in as <strong>{sessionEmail}</strong> with an HttpOnly session cookie. Your database credentials stay
                on the server, and your cloud planner is tied to your account instead of a browser-only ID.
              </p>
              <div className="action-row wrap">
                <button className="primary-button" onClick={pushLocalToCloud}>
                  Save this browser copy to cloud
                </button>
                <button className="ghost-button" onClick={pullCloudToLocal}>
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
                Create a simple account to claim your planner and sync it across devices. This is intentionally lightweight:
                email + password, server-side session cookie, one personal planner per account.
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
            Local edits always save immediately in this browser. Cloud sync is layered on top so the app still feels fast,
            resilient, and usable offline.
          </p>
          {syncPhase === "needs-choice" ? (
            <div className="choice-card">
              <strong>Before auto-sync starts, choose your direction</strong>
              <p>
                The cloud planner and this browser planner don&apos;t look identical yet. Pick the copy you want to keep.
              </p>
              <div className="action-row wrap">
                <button className="primary-button" onClick={pullCloudToLocal}>
                  Use cloud planner here
                </button>
                <button className="ghost-button" onClick={pushLocalToCloud}>
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
        Best default: let the browser handle day-to-day autosave, keep account sync on for continuity across devices, and
        export JSON for portable backups you control.
      </p>
    </section>
  )
}

export default SaveLoadData
