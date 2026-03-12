import { isToday, isWeekend } from "date-fns"
import React, { useState } from "react"
import { COLORS, ColorTextureCode, TEXTURES, UI_COLORS, WEEKEND_COLOR } from "../utils/colors"
import CustomText from "./CustomText"

interface DayProps {
  date: Date
  isColored?: boolean
  colorTextureCode?: ColorTextureCode
  onClick?: () => void
  onMouseDown?: () => void
  onMouseEnter?: () => void
  customText?: string
  onCustomTextChange?: (text: string) => void
  customTextOverflow?: "overflow-x" | "overflow-y" | "no-overflow"
}

const Day: React.FC<DayProps> = ({
  date,
  isColored = false,
  colorTextureCode,
  onClick,
  onMouseDown,
  onMouseEnter,
  customText = "",
  onCustomTextChange,
  customTextOverflow = "overflow-x",
}) => {
  const dayNumber = date.getDate()
  const [isHovered, setIsHovered] = useState(false)
  const [isCreatingCustomText, setIsCreatingCustomText] = useState(false)

  const getBackgroundColor = (): string => {
    if (!isColored || !colorTextureCode || !(colorTextureCode in COLORS)) {
      if (isWeekend(date)) {
        return WEEKEND_COLOR
      }
      return isHovered ? UI_COLORS.background.quaternary : UI_COLORS.background.primary
    }

    const color = COLORS[colorTextureCode as keyof typeof COLORS]
    if (!color) return UI_COLORS.background.primary

    if (isHovered) {
      const match = color.match(/oklch\(([^)]+)\)/)
      if (match) {
        const values = match[1].split(" ")
        if (values.length >= 3) {
          const L = parseFloat(values[0])
          const C = parseFloat(values[1])
          const H = values[2]
          const hoverL = Math.min(0.99, L * 0.985)
          const hoverC = C * 1.02
          return `oklch(${hoverL.toFixed(3)} ${hoverC.toFixed(3)} ${H})`
        }
      }
    }

    return color
  }

  const getBaseBackgroundColor = (): string => {
    if (!isColored || !colorTextureCode || !(colorTextureCode in COLORS)) {
      if (isWeekend(date)) {
        return WEEKEND_COLOR
      }
      return UI_COLORS.background.primary
    }

    const color = COLORS[colorTextureCode as keyof typeof COLORS]
    return color || UI_COLORS.background.primary
  }

  const getTextureStyles = (): React.CSSProperties => {
    if (!isColored || !colorTextureCode || !(colorTextureCode in TEXTURES)) {
      return {}
    }

    const textureCode = colorTextureCode as keyof typeof TEXTURES
    return {
      backgroundColor: UI_COLORS.background.secondary,
      backgroundImage: TEXTURES[textureCode],
      backgroundSize: "9px 9px",
      backgroundPosition: "center 2px",
    }
  }

  const handleDayNumberClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCustomTextChange) {
      setIsCreatingCustomText(true)
      onCustomTextChange("")
    }
  }

  const handleCustomTextChange = (text: string) => {
    if (onCustomTextChange) {
      onCustomTextChange(text)
      if (text.trim().length === 0) {
        setIsCreatingCustomText(false)
      }
    }
  }

  const hasCustomText = customText.trim().length > 0 || isCreatingCustomText

  return (
    <div
      className="day"
      data-colored={isColored ? "true" : "false"}
      onClick={(e) => {
        if (e.target !== e.currentTarget) {
          return
        }
        if (onClick) onClick()
      }}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) {
          return
        }
        if (onMouseDown) onMouseDown()
      }}
      onPointerEnter={(e) => {
        if (e.target !== e.currentTarget) {
          return
        }
        setIsHovered(true)
        if (onMouseEnter) onMouseEnter()
      }}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        padding: hasCustomText ? "1px" : "4px",
        textAlign: "center",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: 600,
        color: UI_COLORS.text.primary,
        backgroundColor: getBackgroundColor(),
        position: "relative",
        cursor: "cell",
        transition: "background-color 0.2s ease, box-shadow 0.2s ease",
        overflow: "visible",
        userSelect: "none",
        border: isToday(date) ? `1.5px solid ${UI_COLORS.border.inset}` : "none",
        boxShadow: isToday(date) ? "inset 0 0 0 1px rgba(255,255,255,0.65)" : "inset 0 1px 0 rgba(255,255,255,0.16)",
        boxSizing: "border-box",
        touchAction: "auto",
        ...getTextureStyles(),
      }}
    >
      {hasCustomText ? (
        <CustomText
          text={customText}
          onTextChange={handleCustomTextChange}
          backgroundColor={getBaseBackgroundColor()}
          hoverBackgroundColor={UI_COLORS.background.quaternary}
          overflowDirection={customTextOverflow}
        />
      ) : (
        <div
          onClick={handleDayNumberClick}
          style={{
            cursor: onCustomTextChange ? "text" : "default",
            padding: "2px 5px",
            borderRadius: "999px",
            transition: "all 0.18s ease",
            display: "inline-block",
            pointerEvents: "auto",
            fontSize: "inherit",
            lineHeight: "1",
            color: isWeekend(date) ? UI_COLORS.text.secondary : UI_COLORS.text.primary,
          }}
          onMouseEnter={(e) => {
            if (onCustomTextChange) {
              e.currentTarget.style.fontWeight = "700"
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.7)"
            }
          }}
          onMouseLeave={(e) => {
            if (onCustomTextChange) {
              e.currentTarget.style.fontWeight = "600"
              e.currentTarget.style.backgroundColor = "transparent"
            }
          }}
        >
          {dayNumber}
        </div>
      )}
    </div>
  )
}

export default Day
