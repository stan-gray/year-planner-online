import React from "react"
import { useCalendar } from "../contexts/CalendarContext"

const CalendarTitle: React.FC = () => {
  const { selectedYear, setSelectedYear } = useCalendar()
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 9 }, (_, index) => currentYear - 2 + index)

  return (
    <div className="planner-hero">
      <div>
        <p className="eyebrow">Annual planner</p>
        <h1>Design the year with more clarity, less noise.</h1>
        <p className="hero-copy">
          Map priorities, mark time visually, and keep the whole year readable at a glance. Everything saves locally in this
          browser first; account sync is optional and uses the app&apos;s own server routes plus an authoritative cloud revision.
        </p>
      </div>

      <label className="year-pill">
        <span>Planner year</span>
        <select value={selectedYear} onChange={(event) => setSelectedYear(parseInt(event.target.value, 10))}>
          {yearOptions.map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              {yearOption}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export default CalendarTitle
