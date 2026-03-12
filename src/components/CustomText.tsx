import React, { useEffect, useRef, useState } from "react"
import { UI_COLORS } from "../utils/colors"

interface CustomTextProps {
  text: string
  onTextChange: (text: string) => void
  backgroundColor: string
  hoverBackgroundColor: string
  overflowDirection?: "overflow-x" | "overflow-y" | "no-overflow"
}

const CustomText: React.FC<CustomTextProps> = ({
  text,
  onTextChange,
  backgroundColor,
  hoverBackgroundColor,
  overflowDirection = "overflow-x",
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const textRef = useRef<HTMLDivElement>(null)

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
    setEditText(text)
  }

  const handleTextEdit = () => {
    const newText = textRef.current?.textContent || ""
    onTextChange(newText)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleTextEdit()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setEditText(text)
      if (text === "") {
        onTextChange("")
      }
    }
  }

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus()
      const range = document.createRange()
      const selection = window.getSelection()
      range.selectNodeContents(textRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isEditing])

  useEffect(() => {
    setEditText(text)
  }, [text])

  useEffect(() => {
    if (text === "" && !isEditing) {
      setIsEditing(true)
      setEditText("")
    }
  }, [text, isEditing])

  const getOverflowStyles = (): React.CSSProperties => {
    switch (overflowDirection) {
      case "overflow-y":
        return {
          whiteSpace: "normal",
          wordWrap: "break-word",
          wordBreak: "break-word",
          position: "absolute",
          top: "1px",
          left: "1px",
          right: "1px",
          minWidth: "calc(100% - 2px)",
          zIndex: isEditing ? 10 : 1,
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
          zIndex: isEditing ? 10 : 1,
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
          zIndex: isEditing ? 10 : 1,
        }
    }
  }

  if (text === "" && !isEditing) {
    return null
  }

  return (
    <div
      ref={textRef}
      contentEditable={isEditing}
      suppressContentEditableWarning={true}
      onClick={handleTextClick}
      onBlur={(e) => {
        e.stopPropagation()
        handleTextEdit()
      }}
      onKeyDown={(e) => {
        e.stopPropagation()
        handleKeyPress(e)
      }}
      style={{
        fontSize: "13px",
        lineHeight: 1.15,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: UI_COLORS.text.primary,
        backgroundColor: backgroundColor,
        padding: "3px 6px",
        borderRadius: "8px",
        cursor: isEditing ? "text" : "pointer",
        outline: "none",
        border: isEditing ? `1px solid ${UI_COLORS.button.primary.normal}` : "1px solid rgba(255,255,255,0.2)",
        boxShadow: isEditing ? "0 0 0 4px rgba(47,91,234,0.14)" : "0 1px 0 rgba(255,255,255,0.35)",
        minHeight: "20px",
        ...getOverflowStyles(),
      }}
      onMouseEnter={(e) => {
        e.stopPropagation()
        if (!isEditing) {
          e.currentTarget.style.backgroundColor = hoverBackgroundColor
        }
      }}
      onMouseLeave={(e) => {
        e.stopPropagation()
        if (!isEditing) {
          e.currentTarget.style.backgroundColor = backgroundColor
        }
      }}
    >
      {isEditing ? editText : text}
    </div>
  )
}

export default CustomText
