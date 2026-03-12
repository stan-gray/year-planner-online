import React from "react"
import { format } from "date-fns"
import { useCalendar } from "../contexts/CalendarContext"

const monthNames = Array.from({ length: 12 }, (_, monthIndex) => format(new Date(2026, monthIndex, 1), "MMM"))
const weekdays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
]

const PlanningSidebar: React.FC = () => {
  const {
    yearlyVision,
    setYearlyVision,
    successDefinition,
    setSuccessDefinition,
    quarterPlans,
    setQuarterPlan,
    monthPlans,
    setMonthPlan,
    routines,
    setRoutine,
    addRoutine,
    removeRoutine,
    applyRoutineToYear,
  } = useCalendar()

  return (
    <aside className="planning-sidebar">
      <section className="panel">
        <p className="section-kicker">Strategy</p>
        <h2>Annual compass</h2>
        <label className="field-label">
          Vision for the year
          <textarea
            value={yearlyVision}
            onChange={(event) => setYearlyVision(event.target.value)}
            placeholder="What would make this year feel meaningful?"
            rows={4}
          />
        </label>
        <label className="field-label">
          Definition of success
          <textarea
            value={successDefinition}
            onChange={(event) => setSuccessDefinition(event.target.value)}
            placeholder="How will you know the plan actually worked?"
            rows={3}
          />
        </label>
      </section>

      <section className="panel">
        <p className="section-kicker">Pacing</p>
        <h2>Quarterly focus</h2>
        <div className="stack-grid">
          {quarterPlans.map((plan, index) => (
            <div key={plan.title} className="mini-card">
              <input
                className="mini-title-input"
                value={plan.title}
                onChange={(event) => setQuarterPlan(index, "title", event.target.value)}
              />
              <textarea
                value={plan.focus}
                onChange={(event) => setQuarterPlan(index, "focus", event.target.value)}
                placeholder="Main outcome, project, or habit for this quarter"
                rows={3}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="section-kicker">Cadence</p>
        <h2>Monthly themes</h2>
        <div className="month-theme-grid">
          {monthPlans.map((plan, index) => (
            <div key={monthNames[index]} className="month-theme-card">
              <strong>{monthNames[index]}</strong>
              <input
                value={plan.theme}
                onChange={(event) => setMonthPlan(index, "theme", event.target.value)}
                placeholder="Theme"
              />
              <input
                value={plan.highlight}
                onChange={(event) => setMonthPlan(index, "highlight", event.target.value)}
                placeholder="Highlight / deadline"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <p className="section-kicker">Templates</p>
            <h2>Reusable routines</h2>
          </div>
          <button className="ghost-button" onClick={addRoutine}>
            Add routine
          </button>
        </div>

        <div className="routine-list">
          {routines.map((routine) => (
            <div key={routine.id} className="mini-card">
              <div className="routine-header">
                <input
                  className="mini-title-input"
                  value={routine.name}
                  onChange={(event) => setRoutine(routine.id, { name: event.target.value })}
                />
                <button className="link-button danger" onClick={() => removeRoutine(routine.id)}>
                  Remove
                </button>
              </div>
              <input
                value={routine.note}
                onChange={(event) => setRoutine(routine.id, { note: event.target.value })}
                placeholder="Optional note added to matching empty days"
              />
              <label className="field-label inline-field">
                Marker
                <select
                  value={routine.colorTexture}
                  onChange={(event) => setRoutine(routine.id, { colorTexture: event.target.value as any })}
                >
                  <option value="red">Red</option>
                  <option value="orange">Orange</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="yellow">Yellow</option>
                  <option value="purple">Purple</option>
                  <option value="teal">Teal</option>
                  <option value="pink">Pink</option>
                  <option value="diagonal-stripes">Diagonal stripes</option>
                  <option value="polka-dots">Polka dots</option>
                  <option value="square-net">Square net</option>
                </select>
              </label>
              <div className="weekday-toggle-row">
                {weekdays.map((day) => {
                  const selected = routine.daysOfWeek.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      className={`weekday-chip${selected ? " selected" : ""}`}
                      onClick={() =>
                        setRoutine(routine.id, {
                          daysOfWeek: selected
                            ? routine.daysOfWeek.filter((value) => value !== day.value)
                            : [...routine.daysOfWeek, day.value].sort(),
                        })
                      }
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  const affected = applyRoutineToYear(routine.id)
                  window.alert(`Applied “${routine.name}” to ${affected} day${affected === 1 ? "" : "s"}.`)
                }}
              >
                Apply across the year
              </button>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

export default PlanningSidebar
