import { eachDayOfInterval, endOfMonth, format, getDay, isSameDay, isToday, startOfMonth } from "date-fns"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useCalendar } from "../contexts/CalendarContext"
import { ColorTextureCode, COLORS, DateCellData, getDateKey, TEXTURES, UI_COLORS, WEEKEND_COLOR } from "../utils/colors"

interface MobilePlannerViewProps {
  selectedYear: number
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MobilePlannerView: React.FC<MobilePlannerViewProps> = ({ selectedYear, dateCells, setDateCells, selectedColorTexture }) => {
  const { monthPlans } = useCalendar()
  const noteInputRef = useRef<HTMLTextAreaElement>(null)
  const currentMonthForYear = new Date().getFullYear() === selectedYear ? new Date().getMonth() : 0
  const [selectedMonth, setSelectedMonth] = useState(currentMonthForYear)
  const [activeDate, setActiveDate] = useState<Date | null>(null)
  const [draftNote, setDraftNote] = useState("")
  const [shouldFocusNote, setShouldFocusNote] = useState(false)

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
  const activeSavedNote = activeCell?.customText || ""
  const activeHasMarker = Boolean(activeCell?.color || activeCell?.texture)
  const draftTrimmed = draftNote.trim()
  const savedTrimmed = activeSavedNote.trim()
  const hasUnsavedChanges = draftTrimmed !== savedTrimmed

  useEffect(() => {
    if (!activeDate) return
    setDraftNote(activeCell?.customText || "")
  }, [activeCell?.customText, activeDate])

  useEffect(() => {
    if (!activeDate || !shouldFocusNote || !noteInputRef.current) return

    const timer = window.setTimeout(() => {
      noteInputRef.current?.focus()
      const length = noteInputRef.current?.value.length || 0
      noteInputRef.current?.setSelectionRange(length, length)
      noteInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
      setShouldFocusNote(false)
    }, 120)

    return () => window.clearTimeout(timer)
  }, [activeDate, shouldFocusNote])

  useEffect(() => {
    if (!activeDate) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDate(null)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleEscape)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleEscape)
    }
  }, [activeDate])

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
      if (draftTrimmed) {
        next.customText = draftTrimmed
      } else {
        delete next.customText
      }
      return Object.keys(next).length ? next : null
    })
  }

  const clearDay = (date: Date) => {
    const nextCells = new Map(dateCells)
    nextCells.delete(getDateKey(date))
    setDateCells(nextCells)
    setDraftNote("")
  }

  const openDaySheet = (date: Date, options?: { focusNote?: boolean }) => {
    setActiveDate(date)
    setShouldFocusNote(Boolean(options?.focusNote))
  }

  const closeDaySheet = () => {
    setDraftNote(activeSavedNote)
    setShouldFocusNote(false)
    setActiveDate(null)
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
          Mobile uses a dedicated day editor now: tap a date to open a full sheet, then add notes with clear save and cancel actions.
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
            {monthPlans[selectedMonth]?.theme ? (
              <p>
                <strong>Theme:</strong> {monthPlans[selectedMonth]?.theme}
              </p>
            ) : null}
            {monthPlans[selectedMonth]?.highlight ? (
              <p>
                <strong>Highlight:</strong> {monthPlans[selectedMonth]?.highlight}
              </p>
            ) : null}
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
                ? {
                    backgroundColor: UI_COLORS.background.secondary,
                    backgroundImage: TEXTURES[cell.texture],
                    backgroundSize: "8px 8px",
                  }
                : { backgroundColor: day.getDay() === 0 || day.getDay() === 6 ? WEEKEND_COLOR : "rgba(255,255,255,0.9)" }

            return (
              <button
                key={getDateKey(day)}
                type="button"
                className={`mobile-day-cell${isToday(day) ? " today" : ""}${isSameDay(activeDate || new Date(0), day) ? " selected" : ""}`}
                style={markerStyle}
                onClick={() => openDaySheet(day)}
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
                <button key={getDateKey(day)} type="button" className="mobile-agenda-item" onClick={() => openDaySheet(day, { focusNote: true })}>
                  <div>
                    <strong>{format(day, "EEE, MMM d")}</strong>
                    <p>{cell.customText?.trim() || "Marked day — tap to add details."}</p>
                  </div>
                  <span>Edit</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-text">No marked days in this month yet. Tap any date above to start.</p>
        )}
      </section>

      {activeDate ? (
        <div className="mobile-sheet-backdrop" onClick={closeDaySheet}>
          <div className="mobile-day-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Edit ${format(activeDate, "EEEE, MMMM d")}`}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-header">
              <div>
                <p className="section-kicker">Day editor</p>
                <h3>{format(activeDate, "EEEE, MMMM d")}</h3>
              </div>
              <button className="ghost-button mobile-close-button" type="button" onClick={closeDaySheet}>
                Close
              </button>
            </div>

            <div className="mobile-day-status-row">
              <div className="mini-badge">{activeHasMarker ? "Marker applied" : "No marker yet"}</div>
              <div className="mini-badge">{savedTrimmed ? "Note saved" : "No note yet"}</div>
            </div>

            <div className="mobile-quick-actions">
              <button className="primary-button" type="button" onClick={() => applyMarker(activeDate)}>
                Apply selected marker
              </button>
              <button className="ghost-button" type="button" onClick={() => setShouldFocusNote(true)}>
                {savedTrimmed ? "Edit note" : "Add note"}
              </button>
              <button className="ghost-button" type="button" onClick={() => clearMarker(activeDate)}>
                Clear marker
              </button>
              <button className="ghost-button danger" type="button" onClick={() => clearDay(activeDate)}>
                Clear day
              </button>
            </div>

            <label className="field-label mobile-note-field">
              Note for this day
              <textarea
                ref={noteInputRef}
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                rows={6}
                placeholder="Trip, launch, deep-work block, celebration…"
              />
            </label>

            <div className="mobile-editor-tip">Notes stay local immediately and continue syncing through the existing save/auth flow.</div>

            <div className="action-row wrap mobile-sheet-actions mobile-sheet-footer-actions">
              <button
                className="primary-button"
                type="button"
                disabled={!hasUnsavedChanges}
                onClick={() => {
                  saveNote(activeDate)
                  setActiveDate(null)
                }}
              >
                Save note
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={!hasUnsavedChanges}
                onClick={() => setDraftNote(activeSavedNote)}
              >
                Cancel changes
              </button>
              <button className="ghost-button" type="button" onClick={closeDaySheet}>
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
