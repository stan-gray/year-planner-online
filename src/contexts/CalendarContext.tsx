import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { ColorTextureCode, DateCellData } from "../utils/colors"

export type CalendarView = "Linear" | "Classic" | "Column"

export interface QuarterPlan {
  title: string
  focus: string
}

export interface MonthPlan {
  theme: string
  highlight: string
}

export interface RoutineTemplate {
  id: string
  name: string
  colorTexture: ColorTextureCode
  daysOfWeek: number[]
  note: string
}

export interface PlannerData {
  selectedYear: number
  dateCells: Record<string, DateCellData>
  selectedColorTexture: ColorTextureCode
  selectedView: CalendarView
  yearlyVision: string
  successDefinition: string
  quarterPlans: QuarterPlan[]
  monthPlans: MonthPlan[]
  routines: RoutineTemplate[]
  onboardingCompleted: boolean
  updatedAt: string
  version: string
}

export interface SaveSnapshot {
  id: string
  createdAt: string
  label: string
  data: PlannerData
}

interface CalendarContextType {
  plannerData: PlannerData
  selectedYear: number
  setSelectedYear: (year: number) => void
  dateCells: Map<string, DateCellData>
  setDateCells: (dateCells: Map<string, DateCellData>) => void
  selectedColorTexture: ColorTextureCode
  setSelectedColorTexture: (colorTexture: ColorTextureCode) => void
  selectedView: CalendarView
  setSelectedView: (view: CalendarView) => void
  yearlyVision: string
  setYearlyVision: (value: string) => void
  successDefinition: string
  setSuccessDefinition: (value: string) => void
  quarterPlans: QuarterPlan[]
  setQuarterPlan: (index: number, key: keyof QuarterPlan, value: string) => void
  monthPlans: MonthPlan[]
  setMonthPlan: (index: number, key: keyof MonthPlan, value: string) => void
  routines: RoutineTemplate[]
  setRoutine: (id: string, updates: Partial<RoutineTemplate>) => void
  addRoutine: () => void
  removeRoutine: (id: string) => void
  applyRoutineToYear: (id: string) => number
  resetPlanner: () => void
  exportPlannerData: () => string
  importPlannerData: (raw: string) => { imported: boolean; message: string }
  replacePlannerData: (data: PlannerData) => void
  saveSnapshots: SaveSnapshot[]
  createSnapshot: (label?: string) => void
  restoreSnapshot: (snapshotId: string) => boolean
  dismissOnboarding: () => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

interface CalendarProviderProps {
  children: React.ReactNode
}

const STORAGE_KEY = "year_planner_data_v3"
const LEGACY_STORAGE_KEY = "calendar_data"
const SNAPSHOTS_KEY = "year_planner_snapshots_v1"
const APP_VERSION = "3.0"
const SNAPSHOT_LIMIT = 8

const currentYear = new Date().getFullYear()

const emptyQuarterPlans = (): QuarterPlan[] =>
  [1, 2, 3, 4].map((quarter) => ({
    title: `Q${quarter}`,
    focus: "",
  }))

const emptyMonthPlans = (): MonthPlan[] =>
  Array.from({ length: 12 }, () => ({
    theme: "",
    highlight: "",
  }))

const starterRoutines = (): RoutineTemplate[] => [
  {
    id: "weekday-focus",
    name: "Focused workdays",
    colorTexture: "blue",
    daysOfWeek: [1, 2, 3, 4],
    note: "Deep work",
  },
  {
    id: "friday-review",
    name: "Friday review",
    colorTexture: "yellow",
    daysOfWeek: [5],
    note: "Weekly review",
  },
  {
    id: "weekend-reset",
    name: "Weekend reset",
    colorTexture: "green",
    daysOfWeek: [0, 6],
    note: "Reset",
  },
]

const defaultPlannerData = (year = currentYear): PlannerData => ({
  selectedYear: year,
  dateCells: {},
  selectedColorTexture: "blue",
  selectedView: "Linear",
  yearlyVision: "",
  successDefinition: "",
  quarterPlans: emptyQuarterPlans(),
  monthPlans: emptyMonthPlans(),
  routines: starterRoutines(),
  onboardingCompleted: false,
  updatedAt: new Date().toISOString(),
  version: APP_VERSION,
})

const parseDateCells = (dateCells: Record<string, DateCellData> | undefined) => new Map(Object.entries(dateCells || {}))

const normalizePlannerData = (raw: any): PlannerData => {
  const base = defaultPlannerData(typeof raw?.selectedYear === "number" ? raw.selectedYear : currentYear)

  return {
    ...base,
    ...raw,
    selectedYear:
      typeof raw?.selectedYear === "number" && raw.selectedYear >= currentYear - 2 && raw.selectedYear <= currentYear + 7
        ? raw.selectedYear
        : base.selectedYear,
    dateCells:
      raw?.dateCells && typeof raw.dateCells === "object" && !Array.isArray(raw.dateCells) ? raw.dateCells : base.dateCells,
    selectedColorTexture: raw?.selectedColorTexture || base.selectedColorTexture,
    selectedView: ["Linear", "Classic", "Column"].includes(raw?.selectedView) ? raw.selectedView : base.selectedView,
    yearlyVision: typeof raw?.yearlyVision === "string" ? raw.yearlyVision : base.yearlyVision,
    successDefinition: typeof raw?.successDefinition === "string" ? raw.successDefinition : base.successDefinition,
    quarterPlans:
      Array.isArray(raw?.quarterPlans) && raw.quarterPlans.length === 4
        ? raw.quarterPlans.map((plan: any, index: number) => ({
            title: typeof plan?.title === "string" && plan.title.trim() ? plan.title : `Q${index + 1}`,
            focus: typeof plan?.focus === "string" ? plan.focus : "",
          }))
        : base.quarterPlans,
    monthPlans:
      Array.isArray(raw?.monthPlans) && raw.monthPlans.length === 12
        ? raw.monthPlans.map((plan: any) => ({
            theme: typeof plan?.theme === "string" ? plan.theme : "",
            highlight: typeof plan?.highlight === "string" ? plan.highlight : "",
          }))
        : base.monthPlans,
    routines:
      Array.isArray(raw?.routines) && raw.routines.length > 0
        ? raw.routines.map((routine: any, index: number) => ({
            id: typeof routine?.id === "string" ? routine.id : `routine-${index}`,
            name: typeof routine?.name === "string" ? routine.name : `Routine ${index + 1}`,
            colorTexture: routine?.colorTexture || "blue",
            daysOfWeek: Array.isArray(routine?.daysOfWeek) ? routine.daysOfWeek.filter((day: any) => Number.isInteger(day)) : [],
            note: typeof routine?.note === "string" ? routine.note : "",
          }))
        : base.routines,
    onboardingCompleted: Boolean(raw?.onboardingCompleted),
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
    version: APP_VERSION,
  }
}

const readStoredPlanner = (): PlannerData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return normalizePlannerData(JSON.parse(stored))
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      return normalizePlannerData(JSON.parse(legacy))
    }
  } catch (error) {
    console.error("Error loading planner data", error)
  }

  return defaultPlannerData()
}

const readSnapshots = (): SaveSnapshot[] => {
  try {
    const stored = localStorage.getItem(SNAPSHOTS_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((snapshot) => ({
        ...snapshot,
        data: normalizePlannerData(snapshot.data),
      }))
      .slice(0, SNAPSHOT_LIMIT)
  } catch (error) {
    console.error("Error reading save snapshots", error)
    return []
  }
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children }) => {
  const [plannerData, setPlannerData] = useState<PlannerData>(() => readStoredPlanner())
  const [saveSnapshots, setSaveSnapshots] = useState<SaveSnapshot[]>(() => readSnapshots())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerData))
    } catch (error) {
      console.error("Error saving planner data", error)
    }
  }, [plannerData])

  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(saveSnapshots))
    } catch (error) {
      console.error("Error saving planner snapshots", error)
    }
  }, [saveSnapshots])

  const updatePlannerData = (updater: (current: PlannerData) => PlannerData) => {
    setPlannerData((current) => {
      const next = normalizePlannerData({
        ...updater(current),
        updatedAt: new Date().toISOString(),
      })
      return next
    })
  }

  const createSnapshot = (label?: string) => {
    setSaveSnapshots((current) => {
      const nextSnapshot: SaveSnapshot = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        label: label?.trim() || `Snapshot ${current.length + 1}`,
        data: plannerData,
      }
      return [nextSnapshot, ...current].slice(0, SNAPSHOT_LIMIT)
    })
  }

  const setSelectedYear = (year: number) => updatePlannerData((current) => ({ ...current, selectedYear: year }))
  const setDateCells = (dateCells: Map<string, DateCellData>) =>
    updatePlannerData((current) => ({ ...current, dateCells: Object.fromEntries(dateCells) }))
  const setSelectedColorTexture = (colorTexture: ColorTextureCode) =>
    updatePlannerData((current) => ({ ...current, selectedColorTexture: colorTexture }))
  const setSelectedView = (view: CalendarView) => updatePlannerData((current) => ({ ...current, selectedView: view }))
  const setYearlyVision = (value: string) => updatePlannerData((current) => ({ ...current, yearlyVision: value }))
  const setSuccessDefinition = (value: string) =>
    updatePlannerData((current) => ({ ...current, successDefinition: value, onboardingCompleted: true }))

  const setQuarterPlan = (index: number, key: keyof QuarterPlan, value: string) => {
    updatePlannerData((current) => ({
      ...current,
      quarterPlans: current.quarterPlans.map((plan, currentIndex) =>
        currentIndex === index ? { ...plan, [key]: value } : plan
      ),
    }))
  }

  const setMonthPlan = (index: number, key: keyof MonthPlan, value: string) => {
    updatePlannerData((current) => ({
      ...current,
      monthPlans: current.monthPlans.map((plan, currentIndex) =>
        currentIndex === index ? { ...plan, [key]: value } : plan
      ),
    }))
  }

  const setRoutine = (id: string, updates: Partial<RoutineTemplate>) => {
    updatePlannerData((current) => ({
      ...current,
      routines: current.routines.map((routine) => (routine.id === id ? { ...routine, ...updates } : routine)),
    }))
  }

  const addRoutine = () => {
    updatePlannerData((current) => ({
      ...current,
      routines: [
        ...current.routines,
        {
          id: `routine-${Date.now()}`,
          name: "New routine",
          colorTexture: current.selectedColorTexture,
          daysOfWeek: [1],
          note: "",
        },
      ],
    }))
  }

  const removeRoutine = (id: string) => {
    updatePlannerData((current) => ({
      ...current,
      routines: current.routines.filter((routine) => routine.id !== id),
    }))
  }

  const applyRoutineToYear = (id: string) => {
    let changedCount = 0

    updatePlannerData((current) => {
      const routine = current.routines.find((entry) => entry.id === id)
      if (!routine) return current

      const nextDateCells = { ...current.dateCells }
      const startDate = new Date(current.selectedYear, 0, 1)
      const endDate = new Date(current.selectedYear, 11, 31)
      const cursor = new Date(startDate)

      while (cursor <= endDate) {
        if (routine.daysOfWeek.includes(cursor.getDay())) {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`
          const existing = nextDateCells[key] || {}
          const updated: DateCellData = { ...existing }
          if (["red", "orange", "green", "blue", "yellow", "purple", "teal", "pink"].includes(routine.colorTexture)) {
            updated.color = routine.colorTexture as DateCellData["color"]
            delete updated.texture
          } else {
            updated.texture = routine.colorTexture as DateCellData["texture"]
            delete updated.color
          }
          if (routine.note.trim() && !updated.customText) {
            updated.customText = routine.note.trim()
          }
          nextDateCells[key] = updated
          changedCount += 1
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      return {
        ...current,
        dateCells: nextDateCells,
        onboardingCompleted: true,
      }
    })

    return changedCount
  }

  const exportPlannerData = () => JSON.stringify(plannerData, null, 2)

  const importPlannerData = (raw: string) => {
    try {
      const parsed = JSON.parse(raw)
      const normalized = normalizePlannerData(parsed)
      setPlannerData(normalized)
      return { imported: true, message: "Planner data imported." }
    } catch (error) {
      console.error(error)
      return { imported: false, message: "That file could not be read. Please choose a valid planner JSON export." }
    }
  }

  const replacePlannerData = (data: PlannerData) => {
    setPlannerData(normalizePlannerData(data))
  }

  const restoreSnapshot = (snapshotId: string) => {
    const snapshot = saveSnapshots.find((entry) => entry.id === snapshotId)
    if (!snapshot) return false
    setPlannerData(snapshot.data)
    return true
  }

  const resetPlanner = () => {
    const freshData = defaultPlannerData(new Date().getFullYear())
    setPlannerData(freshData)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }

  const dismissOnboarding = () => updatePlannerData((current) => ({ ...current, onboardingCompleted: true }))

  const dateCells = useMemo(() => parseDateCells(plannerData.dateCells), [plannerData.dateCells])

  const value: CalendarContextType = {
    plannerData,
    selectedYear: plannerData.selectedYear,
    setSelectedYear,
    dateCells,
    setDateCells,
    selectedColorTexture: plannerData.selectedColorTexture,
    setSelectedColorTexture,
    selectedView: plannerData.selectedView,
    setSelectedView,
    yearlyVision: plannerData.yearlyVision,
    setYearlyVision,
    successDefinition: plannerData.successDefinition,
    setSuccessDefinition,
    quarterPlans: plannerData.quarterPlans,
    setQuarterPlan,
    monthPlans: plannerData.monthPlans,
    setMonthPlan,
    routines: plannerData.routines,
    setRoutine,
    addRoutine,
    removeRoutine,
    applyRoutineToYear,
    resetPlanner,
    exportPlannerData,
    importPlannerData,
    replacePlannerData,
    saveSnapshots,
    createSnapshot,
    restoreSnapshot,
    dismissOnboarding,
  }

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider")
  }
  return context
}
