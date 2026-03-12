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

const MOBILE_MEDIA_QUERY = "(max-width: 860px), (pointer: coarse) and (max-width: 1180px)"

const Calendar: React.FC = () => {
  const { selectedYear, dateCells, setDateCells, selectedColorTexture, selectedView, setSelectedView, plannerData } = useCalendar()
  const [isMobileLayout, setIsMobileLayout] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches)

    syncLayout()
    mediaQuery.addEventListener("change", syncLayout)

    return () => {
      mediaQuery.removeEventListener("change", syncLayout)
    }
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
            {!isMobileLayout ? <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} /> : null}
          </div>

          <section className="calendar-stage">
            {isMobileLayout ? (
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
