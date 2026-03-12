import { addDays, eachDayOfInterval, endOfYear, format, getDay, isSameMonth, startOfYear, subDays } from "date-fns"
import React, { useEffect, useState } from "react"
import { applyColorToDate, ColorTextureCode, DateCellData, getDateKey, UI_COLORS } from "../../utils/colors"
import Day from "../Day"

interface LinearViewProps {
  selectedYear: number
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
}

const LinearView: React.FC<LinearViewProps> = ({ selectedYear, dateCells, setDateCells, selectedColorTexture }) => {
  const [isDragging, setIsDragging] = useState(false)

  const startDate = startOfYear(new Date(selectedYear, 0, 1))
  const endDate = endOfYear(new Date(selectedYear, 11, 31))
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
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

  const fillEmptyCells = (week: Date[]): Date[] => {
    const filledWeek = [...week]
    const firstDate = week.find((day) => day !== null)
    const lastDateIndex = week.length - 1 - week.slice().reverse().findIndex((day) => day !== null)
    const lastDate = week[lastDateIndex]

    if (firstDate && lastDate) {
      for (let i = 0; i < week.length; i++) {
        if (week[i] === null) {
          if (i < week.findIndex((day) => day !== null)) {
            const daysToSubtract = week.findIndex((day) => day !== null) - i
            filledWeek[i] = subDays(firstDate, daysToSubtract)
          } else {
            const daysToAdd = i - lastDateIndex
            filledWeek[i] = addDays(lastDate, daysToAdd)
          }
        }
      }
    }

    return filledWeek
  }

  const weeks: Date[][] = []
  let currentWeek: Date[] = new Array(7).fill(null)

  allDays.forEach((day) => {
    const dayOfWeek = getAdjustedDayOfWeek(day)
    currentWeek[dayOfWeek] = day

    if (dayOfWeek === 6) {
      weeks.push(fillEmptyCells(currentWeek))
      currentWeek = new Array(7).fill(null)
    }
  })

  if (currentWeek.some((day) => day !== null)) {
    weeks.push(fillEmptyCells(currentWeek))
  }

  const shouldShowMonthName = (week: Date[]): string | null => {
    const mondayInWeek = week[0]
    if (mondayInWeek) {
      const monthStart = new Date(mondayInWeek)
      monthStart.setDate(1)
      const firstDayOfMonth = getAdjustedDayOfWeek(monthStart)
      const daysToFirstMonday = firstDayOfMonth === 0 ? 0 : 7 - firstDayOfMonth
      const firstMondayOfMonth = new Date(monthStart)
      firstMondayOfMonth.setDate(1 + daysToFirstMonday)

      if (mondayInWeek.getTime() === firstMondayOfMonth.getTime()) {
        return format(mondayInWeek, "MMMM")
      }
    }

    return null
  }

  const getAdjacentDay = (weekIndex: number, dayIndex: number, direction: "top" | "bottom" | "left" | "right"): Date | null => {
    if (direction === "top") return weekIndex > 0 ? weeks[weekIndex - 1][dayIndex] : null
    if (direction === "bottom") return weekIndex < weeks.length - 1 ? weeks[weekIndex + 1][dayIndex] : null
    if (direction === "left") return dayIndex > 0 ? weeks[weekIndex][dayIndex - 1] : null
    if (direction === "right") return dayIndex < 6 ? weeks[weekIndex][dayIndex + 1] : null
    return null
  }

  const areDifferentMonths = (day1: Date | null, day2: Date | null): boolean => {
    if (!day1 || !day2) return false
    return day1.getFullYear() !== day2.getFullYear() || !isSameMonth(day1, day2)
  }

  const getDayBorderStyles = (day: Date | null, dayIndex: number, weekIndex: number): React.CSSProperties => {
    if (!day) {
      return {
        border: `1px solid ${UI_COLORS.border.secondary}`,
        backgroundColor: "rgba(245,247,251,0.84)",
      }
    }

    const topDay = getAdjacentDay(weekIndex, dayIndex, "top")
    const bottomDay = getAdjacentDay(weekIndex, dayIndex, "bottom")
    const leftDay = getAdjacentDay(weekIndex, dayIndex, "left")
    const rightDay = getAdjacentDay(weekIndex, dayIndex, "right")

    const edge = `1.5px solid ${UI_COLORS.border.primary}`
    const soft = `1px solid ${UI_COLORS.border.secondary}`

    return {
      borderTop: weekIndex === 0 || areDifferentMonths(day, topDay) ? edge : soft,
      borderRight: dayIndex === 6 || areDifferentMonths(day, rightDay) ? edge : soft,
      borderBottom: weekIndex === weeks.length - 1 || areDifferentMonths(day, bottomDay) ? edge : soft,
      borderLeft: dayIndex === 0 || areDifferentMonths(day, leftDay) ? edge : soft,
    }
  }

  return (
    <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table
        style={{
          width: "100%",
          minWidth: "1040px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(248,250,255,0.84))",
          border: `1px solid ${UI_COLORS.border.secondary}`,
          borderRadius: "24px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: "132px",
                padding: "12px 14px",
                fontWeight: 700,
                borderRight: `1px solid ${UI_COLORS.border.secondary}`,
                borderBottom: `1px solid ${UI_COLORS.border.secondary}`,
                backgroundColor: UI_COLORS.background.secondary,
                textAlign: "left",
              }}
            >
              &nbsp;
            </th>
            {dayNames.map((dayName) => (
              <th
                key={dayName}
                style={{
                  padding: "12px 10px",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: UI_COLORS.text.secondary,
                  borderRight: `1px solid ${UI_COLORS.border.secondary}`,
                  borderBottom: `1px solid ${UI_COLORS.border.secondary}`,
                  backgroundColor: UI_COLORS.background.secondary,
                }}
              >
                {dayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => {
            const monthName = shouldShowMonthName(week)

            return (
              <tr key={weekIndex} style={{ minHeight: "58px" }}>
                <td
                  style={{
                    width: "132px",
                    padding: "12px 14px",
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    borderRight: `1px solid ${UI_COLORS.border.secondary}`,
                    backgroundColor: monthName ? "rgba(243,247,255,0.95)" : "rgba(249,250,252,0.68)",
                    color: monthName ? UI_COLORS.text.primary : UI_COLORS.text.secondary,
                    textAlign: "left",
                    verticalAlign: "middle",
                    borderTop: monthName ? `1.5px solid ${UI_COLORS.border.primary}` : `1px solid ${UI_COLORS.border.tertiary}`,
                  }}
                >
                  {monthName || ""}
                </td>

                {week.map((day, dayIndex) => {
                  const dateKey = getDateKey(day)
                  const dateCellData = dateCells.get(dateKey) || {}
                  const isColored = !!(dateCellData.color || dateCellData.texture)
                  const dayColorTexture = dateCellData.color || dateCellData.texture
                  const customText = dateCellData.customText || ""

                  return (
                    <td
                      key={dayIndex}
                      style={{
                        padding: "0",
                        textAlign: "center",
                        verticalAlign: "middle",
                        height: "52px",
                        ...getDayBorderStyles(day, dayIndex, weekIndex),
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
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
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default LinearView
