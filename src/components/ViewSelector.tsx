import React from "react"
import { UI_COLORS } from "../utils/colors"

export type CalendarView = "Linear" | "Classic" | "Column"

interface ViewSelectorProps {
  selectedView: CalendarView
  onViewChange: (view: CalendarView) => void
}

const viewDescriptions: Record<CalendarView, string> = {
  Linear: "Best for year-at-a-glance planning",
  Classic: "Best for monthly review and printing",
  Column: "Best for comparing months side by side",
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ selectedView, onViewChange }) => {
  const views: CalendarView[] = ["Linear", "Classic", "Column"]

  return (
    <section className="panel compact-panel">
      <div className="panel-heading-row">
        <div>
          <p className="section-kicker">Layout</p>
          <h3>Choose a calendar view</h3>
        </div>
        <div className="mini-badge" style={{ borderColor: UI_COLORS.border.tertiary }}>
          {viewDescriptions[selectedView]}
        </div>
      </div>
      <div className="segmented-control">
        {views.map((view) => (
          <button
            key={view}
            className={`segment${selectedView === view ? " active" : ""}`}
            onClick={() => onViewChange(view)}
          >
            {view}
          </button>
        ))}
      </div>
    </section>
  )
}

export default ViewSelector
