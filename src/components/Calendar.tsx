import React, { useEffect, useState } from "react"
import { useCalendar } from "../contexts/CalendarContext"
import CalendarTitle from "./CalendarTitle"
import ColorPicker from "./ColorPicker"
import MobilePlannerView from "./MobilePlannerView"
import OnboardingCard from "./OnboardingCard"
import PlannerInsights from "./PlannerInsights"
import PlanningSidebar from "./PlanningSidebar"
import SaveLoadData from "./SaveLoadData"
import ClassicView from "./views/ClassicView"
import ColumnView from "./views/ColumnView"
import LinearView from "./views/LinearView"
import ViewSelector from "./ViewSelector"

const MOBILE_BREAKPOINT = 1024

const Calendar: React.FC = () => {
  const { selectedYear, dateCells, setDateCells, selectedColorTexture, selectedView, setSelectedView, plannerData } = useCalendar()
  const [isMobilePlanner, setIsMobilePlanner] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobilePlanner(window.innerWidth <= MOBILE_BREAKPOINT)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

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
            {isMobilePlanner ? (
              <MobilePlannerView
                selectedYear={selectedYear}
                dateCells={dateCells}
                setDateCells={setDateCells}
                selectedColorTexture={selectedColorTexture}
              />
            ) : selectedView === "Linear" ? (
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
