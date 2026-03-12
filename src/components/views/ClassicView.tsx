import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns"
import React, { useEffect, useState } from "react"
import { applyColorToDate, ColorTextureCode, DateCellData, getDateKey, UI_COLORS } from "../../utils/colors"
import Day from "../Day"

interface ClassicViewProps {
  selectedYear: number
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
}

const ClassicView: React.FC<ClassicViewProps> = ({ selectedYear, dateCells, setDateCells, selectedColorTexture }) => {
  const [isDragging, setIsDragging] = useState(false)

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const handleMouseDown = (date: Date) => {
    setIsDragging(true)
    applyColorToDate(date, dateCells, selectedColorTexture, setDateCells)
  }

  const handleMouseEnter = (date: Date) => {
    if (isDragging) {
      applyColorToDate(date, dateCells, selectedColorTexture, setDateCells)
    }
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    const handleGlobalTouchEnd = () => setIsDragging(false)

    document.addEventListener("mouseup", handleGlobalMouseUp)
    document.addEventListener("touchend", handleGlobalTouchEnd)
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp)
      document.removeEventListener("touchend", handleGlobalTouchEnd)
    }
  }, [])

  const handleCustomTextChange = (date: Date, text: string) => {
    const dateKey = getDateKey(date)
    const newDateCells = new Map(dateCells)
    const currentCell = dateCells.get(dateKey) || {}

    if (text.trim()) {
      newDateCells.set(dateKey, {
        ...currentCell,
        customText: text,
      })
    } else {
      const updatedCell = { ...currentCell }
      delete updatedCell.customText

      if (Object.keys(updatedCell).length === 0) {
        newDateCells.delete(dateKey)
      } else {
        newDateCells.set(dateKey, updatedCell)
      }
    }

    setDateCells(newDateCells)
  }

  const getAdjustedDayOfWeek = (date: Date): number => {
    const day = getDay(date)
    return day === 0 ? 6 : day - 1
  }

  const getWeeksForMonth = (month: number): Date[][] => {
    const startDate = startOfMonth(new Date(selectedYear, month, 1))
    const endDate = endOfMonth(new Date(selectedYear, month, 1))

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    const weeks: Date[][] = []
    let currentWeek: Date[] = new Array(7).fill(null)

    allDays.forEach((day) => {
      const dayOfWeek = getAdjustedDayOfWeek(day)
      currentWeek[dayOfWeek] = day

      if (dayOfWeek === 6) {
        weeks.push([...currentWeek])
        currentWeek = new Array(7).fill(null)
      }
    })

    if (currentWeek.some((day) => day !== null)) {
      weeks.push([...currentWeek])
    }

    return weeks
  }

  const months = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "18px",
        maxWidth: "100%",
        padding: "4px",
      }}
    >
      {months.map((month) => {
        const weeks = getWeeksForMonth(month)
        const monthName = format(new Date(selectedYear, month, 1), "MMMM")

        return (
          <section
            key={month}
            style={{
              border: `1px solid ${UI_COLORS.border.secondary}`,
              borderRadius: "22px",
              overflow: "hidden",
              background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,255,0.88))",
              boxShadow: "0 12px 28px rgba(15,23,42,0.07)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: "14px 16px 12px",
                textAlign: "center",
                borderBottom: `1px solid ${UI_COLORS.border.secondary}`,
                fontWeight: 700,
                fontSize: "17px",
                letterSpacing: "-0.02em",
                backgroundColor: UI_COLORS.background.secondary,
              }}
            >
              {monthName}
            </div>

            <div style={{ width: "100%", overflow: "hidden", padding: "8px" }}>
              <table style={{ width: "100%", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {dayNames.map((dayName) => (
                      <th
                        key={dayName}
                        style={{
                          padding: "6px 2px 10px",
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: UI_COLORS.text.secondary,
                          backgroundColor: "transparent",
                          width: "14.28%",
                        }}
                      >
                        {dayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, weekIndex) => (
                    <tr key={weekIndex}>
                      {week.map((day, dayIndex) => {
                        if (!day) {
                          return (
                            <td
                              key={dayIndex}
                              style={{
                                padding: "0",
                                border: `1px solid ${UI_COLORS.border.tertiary}`,
                                width: "14.28%",
                                height: "44px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(245,247,251,0.85)",
                              }}
                            />
                          )
                        }

                        const dateKey = getDateKey(day)
                        const dayData = dateCells.get(dateKey) || {}
                        const isColored = !!(dayData.color || dayData.texture)
                        const dayColorTexture = dayData.color || dayData.texture
                        const customText = dayData.customText || ""

                        return (
                          <td
                            key={dayIndex}
                            style={{
                              padding: "0",
                              border: `1px solid ${UI_COLORS.border.tertiary}`,
                              width: "14.28%",
                              height: "44px",
                              overflow: "visible",
                            }}
                          >
                            <Day
                              date={day}
                              isColored={isColored}
                              colorTextureCode={dayColorTexture}
                              onMouseDown={() => handleMouseDown(day)}
                              onMouseEnter={() => handleMouseEnter(day)}
                              onCustomTextChange={(text) => handleCustomTextChange(day, text)}
                              customText={customText}
                              customTextOverflow="overflow-x"
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default ClassicView
