import React from "react"
import { useCalendar } from "../contexts/CalendarContext"
import { ALL_COLOR_TEXTURE_CODES, COLORS, ColorTextureCode, TEXTURES, UI_COLORS } from "../utils/colors"

const ColorPicker: React.FC = () => {
  const { selectedColorTexture, setSelectedColorTexture } = useCalendar()

  const getBackgroundStyle = (code: ColorTextureCode): React.CSSProperties => {
    if (code in COLORS) {
      return { backgroundColor: COLORS[code as keyof typeof COLORS] }
    }

    return {
      backgroundColor: UI_COLORS.background.secondary,
      backgroundImage: TEXTURES[code as keyof typeof TEXTURES],
      backgroundSize: "6px 6px",
    }
  }

  return (
    <section className="panel compact-panel">
      <div className="panel-heading-row">
        <div>
          <p className="section-kicker">Palette</p>
          <h3>Pick a marker</h3>
        </div>
        <div className="mini-badge">Tap a day to paint, tap the number to add text</div>
      </div>
      <div className="palette-grid">
        {ALL_COLOR_TEXTURE_CODES.map((code) => {
          const isSelected = selectedColorTexture === code
          return (
            <button
              key={code}
              className={`palette-swatch${isSelected ? " selected" : ""}`}
              onClick={() => setSelectedColorTexture(code)}
              style={getBackgroundStyle(code)}
              title={code.replace(/-/g, " ")}
              aria-label={`Use ${code.replace(/-/g, " ")}`}
            />
          )
        })}
      </div>
    </section>
  )
}

export default ColorPicker
