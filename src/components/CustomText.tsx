import React, { useEffect, useRef, useState } from "react"
import { UI_COLORS } from "../utils/colors"

interface CustomTextProps {
  text: string
  onTextChange: (text: string) => void
  backgroundColor: string
  hoverBackgroundColor: string
  overflowDirection?: "overflow-x" | "overflow-y" | "no-overflow"
  startEditing?: boolean
}

const CustomText: React.FC<CustomTextProps> = ({
  text,
  onTextChange,
  backgroundColor,
  hoverBackgroundColor,
  overflowDirection = "overflow-x",
  startEditing = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(text)
  }, [text])

  useEffect(() => {
    if (startEditing) {
      setIsEditing(true)
    }
  }, [startEditing])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
    }
  }, [isEditing])

  const commit = () => {
    onTextChange(draft.trim())
    setIsEditing(false)
  }

  const cancel = () => {
    setDraft(text)
    setIsEditing(false)
  }

  const getOverflowStyles = (): React.CSSProperties => {
    switch (overflowDirection) {
      case "overflow-y":
        return {
          whiteSpace: "normal",
          wordWrap: "break-word",
          wordBreak: "break-word",
          position: "absolute",
          inset: "1px",
          minWidth: "calc(100% - 2px)",
        }
      case "no-overflow":
        return {
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          position: "absolute",
          top: "50%",
          left: "6px",
          right: "6px",
          transform: "translateY(-50%)",
        }
      case "overflow-x":
      default:
        return {
          whiteSpace: "nowrap",
          overflow: "visible",
          position: "absolute",
          top: "50%",
          left: "6px",
          transform: "translateY(-50%)",
        }
    }
  }

  if (!text && !isEditing && !startEditing) return null

  if (isEditing) {
    return (
      <div
        style={{
          position: "absolute",
          inset: "1px",
          zIndex: 12,
          background: "rgba(255,255,255,0.98)",
          border: `1px solid ${UI_COLORS.button.primary.normal}`,
          borderRadius: "10px",
          boxShadow: "0 10px 24px rgba(15,23,42,0.16)",
          padding: "4px",
          display: "grid",
          gap: "4px",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation()
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault()
              commit()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              cancel()
            }
          }}
          rows={3}
          placeholder="Add note"
          style={{ minHeight: "58px", padding: "6px 8px", fontSize: "13px", borderRadius: "8px" }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        setIsEditing(true)
      }}
      style={{
        fontSize: "13px",
        lineHeight: 1.15,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: UI_COLORS.text.primary,
        backgroundColor,
        padding: "3px 6px",
        borderRadius: "8px",
        cursor: "text",
        outline: "none",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.35)",
        minHeight: "20px",
        textAlign: "left",
        ...getOverflowStyles(),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBackgroundColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = backgroundColor
      }}
      aria-label={text ? `Edit note: ${text}` : "Add note"}
      title="Edit note"
    >
      {text}
    </button>
  )
}

export default CustomText
