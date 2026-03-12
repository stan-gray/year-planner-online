import React, { useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"

const SaveLoadData: React.FC = () => {
  const { exportPlannerData, importPlannerData, saveSnapshots, createSnapshot, restoreSnapshot, resetPlanner, plannerData } =
    useCalendar()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [statusMessage, setStatusMessage] = useState<string>("")

  const storageSummary = useMemo(
    () =>
      plannerData.updatedAt
        ? `Autosaved in this browser ${formatDistanceToNow(new Date(plannerData.updatedAt), { addSuffix: true })}.`
        : "Autosaved in this browser.",
    [plannerData.updatedAt]
  )

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

  return (
    <section className="panel save-panel">
      <div className="panel-heading-row">
        <div>
          <p className="section-kicker">Safety</p>
          <h2>Save, restore, and move your plan safely</h2>
        </div>
        <div className="mini-badge">No database. No cloud secrets. Just local-first backups.</div>
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
            Best no-database workflow: keep autosave on, export a JSON backup after meaningful changes, and store it in
            your own cloud drive or git repo.
          </p>
          {statusMessage ? <p className="success-text">{statusMessage}</p> : null}
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
        Safe path for multi-device use: export JSON and sync it yourself via iCloud Drive, Dropbox, Google Drive, git,
        or any file sync you already trust. This app intentionally avoids client-side tokens and hidden cloud writes.
      </p>
    </section>
  )
}

export default SaveLoadData
