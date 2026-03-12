import React from "react"
import { useCalendar } from "../contexts/CalendarContext"
import CalendarTitle from "./CalendarTitle"
import ColorPicker from "./ColorPicker"
import OnboardingCard from "./OnboardingCard"
import PlannerInsights from "./PlannerInsights"
import PlanningSidebar from "./PlanningSidebar"
import SaveLoadData from "./SaveLoadData"
import ClassicView from "./views/ClassicView"
import ColumnView from "./views/ColumnView"
import LinearView from "./views/LinearView"
import ViewSelector from "./ViewSelector"

const Calendar: React.FC = () => {
  const { selectedYear, dateCells, setDateCells, selectedColorTexture, selectedView, setSelectedView, plannerData } = useCalendar()

  return (
    <div className="planner-shell">
      <CalendarTitle />
      {!plannerData.onboardingCompleted ? <OnboardingCard /> : null}
      <PlannerInsights />

      <div className="planner-content">
        <PlanningSidebar />

        <main className="planner-main">
          <div className="toolbar-grid no-print">
            <ColorPicker />
            <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
          </div>

          <section className="calendar-stage">
            {selectedView === "Linear" ? (
              <LinearView
                selectedYear={selectedYear}
                dateCells={dateCells}
                setDateCells={setDateCells}
                selectedColorTexture={selectedColorTexture}
              />
            ) : selectedView === "Classic" ? (
              <ClassicView
                selectedYear={selectedYear}
                dateCells={dateCells}
                setDateCells={setDateCells}
                selectedColorTexture={selectedColorTexture}
              />
            ) : (
              <ColumnView
                selectedYear={selectedYear}
                dateCells={dateCells}
                setDateCells={setDateCells}
                selectedColorTexture={selectedColorTexture}
              />
            )}
          </section>
        </main>
      </div>

      <div className="no-print">
        <SaveLoadData />
      </div>
    </div>
  )
}

export default Calendar
