import { eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, isToday, startOfMonth } from "date-fns"
import React, { useEffect, useMemo, useState } from "react"
import { DateCellData, getDateKey, UI_COLORS } from "../utils/colors"
import { useCalendar } from "../contexts/CalendarContext"
import { ColorTextureCode, COLORS, TEXTURES, WEEKEND_COLOR } from "../utils/colors"

interface MobilePlannerViewProps {
  selectedYear: number
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MobilePlannerView: React.FC<MobilePlannerViewProps> = ({ selectedYear, dateCells, setDateCells, selectedColorTexture }) => {
  const { monthPlans } = useCalendar()
  const currentMonthForYear = new Date().getFullYear() === selectedYear ? new Date().getMonth() : 0
  const [selectedMonth, setSelectedMonth] = useState(currentMonthForYear)
  const [activeDate, setActiveDate] = useState<Date | null>(null)
  const [draftNote, setDraftNote] = useState("")

  useEffect(() => {
    setSelectedMonth(currentMonthForYear)
  }, [currentMonthForYear])

  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1))
  const monthEnd = endOfMonth(monthStart)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const calendarCells = useMemo(() => {
    const leading = (getDay(monthStart) + 6) % 7
    const cells: Array<Date | null> = Array.from({ length: leading }, () => null)
    cells.push(...allDays)
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
    return cells
  }, [allDays, monthStart])

  const highlightedDays = useMemo(
    () =>
      allDays.filter((day) => {
        const cell = dateCells.get(getDateKey(day))
        return Boolean(cell?.color || cell?.texture || cell?.customText?.trim())
      }),
    [allDays, dateCells]
  )

  const activeCell = activeDate ? dateCells.get(getDateKey(activeDate)) || {} : null

  useEffect(() => {
    if (!activeDate) return
    setDraftNote(activeCell?.customText || "")
  }, [activeCell?.customText, activeDate])

  const updateDateCell = (date: Date, updater: (current: DateCellData) => DateCellData | null) => {
    const key = getDateKey(date)
    const nextCells = new Map(dateCells)
    const current = nextCells.get(key) || {}
    const next = updater(current)
    if (!next || Object.keys(next).length === 0) {
      nextCells.delete(key)
    } else {
      nextCells.set(key, next)
    }
    setDateCells(nextCells)
  }

  const applyMarker = (date: Date) => {
    updateDateCell(date, (current) => {
      const next: DateCellData = { ...current }
      if (selectedColorTexture in COLORS) {
        next.color = selectedColorTexture as DateCellData["color"]
        delete next.texture
      } else {
        next.texture = selectedColorTexture as DateCellData["texture"]
        delete next.color
      }
      return next
    })
  }

  const clearMarker = (date: Date) => {
    updateDateCell(date, (current) => {
      const next: DateCellData = { ...current }
      delete next.color
      delete next.texture
      return Object.keys(next).length ? next : null
    })
  }

  const saveNote = (date: Date) => {
    updateDateCell(date, (current) => {
      const next: DateCellData = { ...current }
      if (draftNote.trim()) {
        next.customText = draftNote.trim()
      } else {
        delete next.customText
      }
      return Object.keys(next).length ? next : null
    })
  }

  const selectedMarkerPreview: React.CSSProperties =
    selectedColorTexture in COLORS
      ? { backgroundColor: COLORS[selectedColorTexture as keyof typeof COLORS] }
      : {
          backgroundColor: UI_COLORS.background.secondary,
          backgroundImage: TEXTURES[selectedColorTexture as keyof typeof TEXTURES],
          backgroundSize: "8px 8px",
        }

  return (
    <div className="mobile-planner-shell">
      <section className="panel mobile-planner-intro">
        <div className="panel-heading-row">
          <div>
            <p className="section-kicker">Mobile planner</p>
            <h2>Month-first, touch-friendly planning</h2>
          </div>
          <div className="mini-badge mobile-marker-badge">
            <span className="mobile-marker-preview" style={selectedMarkerPreview} />
            Marker ready: {selectedColorTexture.replace(/-/g, " ")}
          </div>
        </div>
        <p className="mobile-helper-copy">
          Pick a month, tap a day, and make edits in a roomy sheet instead of tiny inline cells. The full planner still syncs with desktop.
        </p>
        <div className="mobile-month-strip" role="tablist" aria-label="Months">
          {Array.from({ length: 12 }, (_, monthIndex) => (
            <button
              key={monthIndex}
              type="button"
              className={`mobile-month-pill${selectedMonth === monthIndex ? " active" : ""}`}
              onClick={() => setSelectedMonth(monthIndex)}
            >
              {format(new Date(selectedYear, monthIndex, 1), "MMM")}
            </button>
          ))}
        </div>
      </section>

      <section className="panel mobile-month-panel">
        <div className="panel-heading-row">
          <div>
            <p className="section-kicker">Focused month</p>
            <h3>{format(monthStart, "MMMM yyyy")}</h3>
          </div>
          <div className="mini-badge">{highlightedDays.length} planned days</div>
        </div>

        {monthPlans[selectedMonth]?.theme || monthPlans[selectedMonth]?.highlight ? (
          <div className="mobile-month-summary">
            {monthPlans[selectedMonth]?.theme ? <p><strong>Theme:</strong> {monthPlans[selectedMonth]?.theme}</p> : null}
            {monthPlans[selectedMonth]?.highlight ? <p><strong>Highlight:</strong> {monthPlans[selectedMonth]?.highlight}</p> : null}
          </div>
        ) : null}

        <div className="mobile-calendar-grid" role="grid">
          {weekdays.map((day) => (
            <div key={day} className="mobile-weekday-label">
              {day}
            </div>
          ))}
          {calendarCells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="mobile-day-cell mobile-day-empty" aria-hidden="true" />
            }

            const cell = dateCells.get(getDateKey(day)) || {}
            const hasMarker = Boolean(cell.color || cell.texture)
            const hasNote = Boolean(cell.customText?.trim())
            const markerStyle: React.CSSProperties = cell.color
              ? { backgroundColor: COLORS[cell.color] }
              : cell.texture
                ? { backgroundColor: UI_COLORS.background.secondary, backgroundImage: TEXTURES[cell.texture], backgroundSize: "8px 8px" }
                : { backgroundColor: day.getDay() === 0 || day.getDay() === 6 ? WEEKEND_COLOR : "rgba(255,255,255,0.9)" }

            return (
              <button
                key={getDateKey(day)}
                type="button"
                className={`mobile-day-cell${isToday(day) ? " today" : ""}${isSameMonth(activeDate || new Date(0), day) && activeDate?.getDate() === day.getDate() ? " selected" : ""}`}
                style={markerStyle}
                onClick={() => setActiveDate(day)}
              >
                <span className="mobile-day-number">{day.getDate()}</span>
                {hasNote ? <span className="mobile-day-note-dot" /> : null}
                {hasMarker ? <span className="mobile-day-marker-label">Marked</span> : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel mobile-agenda-panel">
        <div className="panel-heading-row">
          <div>
            <p className="section-kicker">Month notes</p>
            <h3>What already has signal</h3>
          </div>
        </div>
        {highlightedDays.length ? (
          <div className="mobile-agenda-list">
            {highlightedDays.map((day) => {
              const cell = dateCells.get(getDateKey(day)) || {}
              return (
                <button key={getDateKey(day)} type="button" className="mobile-agenda-item" onClick={() => setActiveDate(day)}>
                  <div>
                    <strong>{format(day, "EEE, MMM d")}</strong>
                    <p>{cell.customText?.trim() || "Marked day — tap to edit details."}</p>
                  </div>
                  <span>Open</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-text">No marked days in this month yet. Tap any date above to start.</p>
        )}
      </section>

      {activeDate ? (
        <div className="mobile-sheet-backdrop" onClick={() => setActiveDate(null)}>
          <div className="mobile-day-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <p className="section-kicker">Day editor</p>
            <h3>{format(activeDate, "EEEE, MMMM d")}</h3>
            <p className="mobile-helper-copy">Use your current marker, clear the day, or leave yourself a note.</p>
            <div className="action-row wrap mobile-sheet-actions">
              <button className="primary-button" type="button" onClick={() => applyMarker(activeDate)}>
                Apply selected marker
              </button>
              <button className="ghost-button" type="button" onClick={() => clearMarker(activeDate)}>
                Clear marker
              </button>
            </div>
            <label className="field-label">
              Note
              <textarea value={draftNote} onChange={(event) => setDraftNote(event.target.value)} rows={5} placeholder="Trip, launch, deep-work block, celebration…" />
            </label>
            <div className="action-row wrap mobile-sheet-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  saveNote(activeDate)
                  setActiveDate(null)
                }}
              >
                Save note
              </button>
              <button className="ghost-button" type="button" onClick={() => setActiveDate(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MobilePlannerView
