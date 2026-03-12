import React, { useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"
import { getRemotePlannerId, loadPlannerRemotely, savePlannerRemotely } from "../lib/remotePlanner"

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
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [remotePlannerId, setRemotePlannerId] = useState<string>("")
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<string>("")
  const [isSavingRemote, setIsSavingRemote] = useState(false)
  const [isLoadingRemote, setIsLoadingRemote] = useState(false)

  useEffect(() => {
    setRemotePlannerId(getRemotePlannerId())
  }, [])

  const storageSummary = useMemo(
    () =>
      plannerData.updatedAt
        ? `Autosaved in this browser ${formatDistanceToNow(new Date(plannerData.updatedAt), { addSuffix: true })}.`
        : "Autosaved in this browser.",
    [plannerData.updatedAt]
  )

  const remoteSummary = useMemo(() => {
    if (!remotePlannerId) return "Preparing secure online storage…"
    if (!remoteUpdatedAt) return "No online save yet for this planner." 
    return `Last online save ${formatDistanceToNow(new Date(remoteUpdatedAt), { addSuffix: true })}.`
  }, [remotePlannerId, remoteUpdatedAt])

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

  const handleRemoteSave = async () => {
    if (!remotePlannerId) return

    setIsSavingRemote(true)
    try {
      const result = await savePlannerRemotely(remotePlannerId, plannerData)
      setRemoteUpdatedAt(result.updatedAt)
      setStatusMessage("Saved planner online securely via the server.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save planner online.")
    } finally {
      setIsSavingRemote(false)
    }
  }

  const handleRemoteLoad = async () => {
    if (!remotePlannerId) return

    setIsLoadingRemote(true)
    try {
      const result = await loadPlannerRemotely(remotePlannerId)
      replacePlannerData(result.plannerData)
      setRemoteUpdatedAt(result.updatedAt)
      setStatusMessage("Loaded planner from secure online storage.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load planner online.")
    } finally {
      setIsLoadingRemote(false)
    }
  }

  return (
    <section className="panel save-panel">
      <div className="panel-heading-row">
        <div>
          <p className="section-kicker">Safety</p>
          <h2>Save, restore, and sync your plan safely</h2>
        </div>
        <div className="mini-badge">Local-first in the browser, optional secure save/load through the server</div>
      </div>

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
        <button className="ghost-button" onClick={handleRemoteSave} disabled={!remotePlannerId || isSavingRemote}>
          {isSavingRemote ? "Saving online…" : "Save online"}
        </button>
        <button className="ghost-button" onClick={handleRemoteLoad} disabled={!remotePlannerId || isLoadingRemote}>
          {isLoadingRemote ? "Loading online…" : "Load online"}
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
          Reset planner
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileChange} />
      </div>

      <div className="save-grid">
        <div className="summary-card">
          <strong>Current status</strong>
          <p>{storageSummary}</p>
          <p>
            Best workflow: keep local autosave on for day-to-day edits, export JSON after meaningful updates, and use online
            save/load when you want a server-backed copy.
          </p>
          {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
        </div>
        <div className="summary-card">
          <strong>Secure online storage</strong>
          <p>{remoteSummary}</p>
          <p>
            The browser only talks to this app&apos;s own API route. Database credentials stay server-side in Vercel env vars,
            not in frontend code.
          </p>
          {remotePlannerId ? (
            <p className="footer-note" style={{ marginTop: "0.75rem" }}>
              Planner ID: <code>{remotePlannerId}</code>
            </p>
          ) : null}
        </div>
        <div className="summary-card">
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
            <p>No snapshots yet. Create one before major edits.</p>
          )}
        </div>
      </div>

      <p className="footer-note">
        Local-first remains the default. Online save/load is there when you want a server-backed copy, while JSON export stays
        the most portable backup.
      </p>
    </section>
  )
}

export default SaveLoadData
