export type ColorCode = "red" | "orange" | "green" | "blue" | "yellow" | "purple" | "teal" | "pink"

export type TextureCode = "diagonal-stripes" | "polka-dots" | "square-net"

export type ColorTextureCode = ColorCode | TextureCode

export interface ColorTextureSelection {
  colorCode?: ColorCode
  textureCode?: TextureCode
}

export interface DateCellData {
  color?: ColorCode
  texture?: TextureCode
  customText?: string
}

export const COLORS: Record<ColorCode, string> = {
  red: "oklch(0.76 0.16 20)",
  orange: "oklch(0.84 0.16 62)",
  green: "oklch(0.81 0.14 150)",
  blue: "oklch(0.81 0.12 243)",
  yellow: "oklch(0.89 0.14 97)",
  purple: "oklch(0.82 0.13 305)",
  teal: "oklch(0.82 0.11 205)",
  pink: "oklch(0.84 0.11 352)",
}

export const WEEKEND_COLOR = "oklch(0.965 0.008 240)"

export const UI_COLORS = {
  background: {
    primary: "oklch(0.99 0.003 255)",
    secondary: "oklch(0.97 0.006 255)",
    tertiary: "oklch(0.978 0.004 255)",
    quaternary: "oklch(0.95 0.008 255)",
    hover: "oklch(0.94 0.012 255)",
  },

  border: {
    primary: "rgba(15, 23, 42, 0.28)",
    secondary: "rgba(15, 23, 42, 0.12)",
    tertiary: "rgba(15, 23, 42, 0.08)",
    inset: "rgba(37, 99, 235, 0.55)",
  },

  text: {
    primary: "#152033",
    secondary: "#5f6b7e",
    white: "#f9fbff",
  },

  button: {
    primary: {
      normal: "#2f5bea",
      hover: "#2348c8",
    },
    success: {
      normal: "#1f8f61",
      hover: "#18734e",
    },
    danger: {
      normal: "#c04a57",
      hover: "#a43a46",
    },
  },
} as const

export const TEXTURES: Record<TextureCode, string> = {
  "diagonal-stripes":
    "url(\"data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='diagonal' patternUnits='userSpaceOnUse' width='6' height='6'%3E%3Cpath d='M 0 0 L 6 6' stroke='%23c7cfdb' stroke-width='1' fill='none'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23diagonal)'/%3E%3C/svg%3E\")",
  "polka-dots": "radial-gradient(circle at 1.5px 1.5px, #c7cfdb 1.5px, transparent 1.5px)",
  "square-net": "linear-gradient(#c7cfdb 1px, transparent 1px), linear-gradient(90deg, #c7cfdb 1px, transparent 1px)",
}

export const ALL_COLOR_TEXTURE_CODES: ColorTextureCode[] = [
  "red",
  "orange",
  "green",
  "blue",
  "yellow",
  "purple",
  "teal",
  "pink",
  "diagonal-stripes",
  "polka-dots",
  "square-net",
]

export const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export const applyColorToDate = (
  date: Date,
  dateCells: Map<string, DateCellData>,
  selectedColorTexture: ColorTextureCode,
  setDateCells: (dateCells: Map<string, DateCellData>) => void
) => {
  const dateKey = getDateKey(date)
  const newDateCells = new Map(dateCells)
  const currentCell = dateCells.get(dateKey)

  const isColor = Object.keys(COLORS).includes(selectedColorTexture)
  const isTexture = Object.keys(TEXTURES).includes(selectedColorTexture)

  const currentMatchesSelection =
    (isColor && currentCell?.color === selectedColorTexture) ||
    (isTexture && currentCell?.texture === selectedColorTexture)

  if (currentMatchesSelection) {
    const updatedCell = { ...currentCell }
    if (isColor) {
      delete updatedCell.color
    } else if (isTexture) {
      delete updatedCell.texture
    }

    if (Object.keys(updatedCell).length === 0) {
      newDateCells.delete(dateKey)
    } else {
      newDateCells.set(dateKey, updatedCell)
    }
  } else {
    const updatedCell = { ...currentCell }
    if (isColor) {
      updatedCell.color = selectedColorTexture as ColorCode
      delete updatedCell.texture
    } else if (isTexture) {
      updatedCell.texture = selectedColorTexture as TextureCode
      delete updatedCell.color
    }
    newDateCells.set(dateKey, updatedCell)
  }

  setDateCells(newDateCells)
}
