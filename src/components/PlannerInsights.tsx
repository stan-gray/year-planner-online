import React, { useMemo } from "react"
import { format } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"

const PlannerInsights: React.FC = () => {
  const { selectedYear, dateCells, yearlyVision, successDefinition, monthPlans } = useCalendar()

  const stats = useMemo(() => {
    const entries = Array.from(dateCells.entries())
    const totalMarked = entries.length
    const withNotes = entries.filter(([, data]) => Boolean(data.customText?.trim())).length
    const colorCounts = entries.reduce<Record<string, number>>((accumulator, [, data]) => {
      const key = data.color || data.texture || "unmarked"
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})
    const topMarkers = Object.entries(colorCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)

    return { totalMarked, withNotes, topMarkers }
  }, [dateCells])

  const currentMonthIndex = new Date().getMonth()

  return (
    <section className="panel insights-panel">
      <div className="panel-heading-row">
        <div>
          <p className="section-kicker">Dashboard</p>
          <h2>{selectedYear} at a glance</h2>
        </div>
        <div className="mini-badge">Private, browser-only, exportable</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalMarked}</span>
          <span className="stat-label">Marked days</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.withNotes}</span>
          <span className="stat-label">Days with notes</span>
        </div>
        <div className="stat-card wide">
          <span className="stat-label">Most-used markers</span>
          <div className="marker-list">
            {stats.topMarkers.length ? (
              stats.topMarkers.map(([marker, count]) => (
                <span key={marker} className="mini-badge">
                  {marker.replace(/-/g, " ")}: {count}
                </span>
              ))
            ) : (
              <span className="empty-text">Nothing marked yet.</span>
            )}
          </div>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <strong>Annual direction</strong>
          <p>{yearlyVision.trim() || "Write a yearly vision to keep the calendar from turning into a random pile of colored days."}</p>
        </div>
        <div className="summary-card">
          <strong>Definition of success</strong>
          <p>{successDefinition.trim() || "Define what “done” looks like so the planner can guide tradeoffs."}</p>
        </div>
        <div className="summary-card">
          <strong>This month</strong>
          <p>
            <span className="summary-card-label">{format(new Date(selectedYear, currentMonthIndex, 1), "MMMM")}</span>
            {monthPlans[currentMonthIndex]?.theme || "No theme set yet."}
          </p>
          {monthPlans[currentMonthIndex]?.highlight ? <p>Highlight: {monthPlans[currentMonthIndex].highlight}</p> : null}
        </div>
      </div>
    </section>
  )
}

export default PlannerInsights
