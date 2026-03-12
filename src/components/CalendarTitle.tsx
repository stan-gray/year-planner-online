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
        <h1>Plan the year like it’s a real system, not a blank grid.</h1>
        <p className="hero-copy">
          Paint important dates, map quarterly goals, set monthly themes, and keep your plan backed up locally with
          exportable snapshots.
        </p>
      </div>

      <label className="year-pill">
        <span>Year</span>
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
