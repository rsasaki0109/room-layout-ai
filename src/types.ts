export type FurnitureType = 'bed' | 'desk' | 'chair' | 'sofa' | 'monitor' | 'shelf'

export type FurnitureItem = {
  id: string
  type: FurnitureType
  label: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
}

export type FurnitureTemplate = Omit<FurnitureItem, 'id' | 'x' | 'y' | 'rotation'>

export type Room = {
  width: number
  height: number
}

export type MetricKey =
  | 'walkingEfficiency'
  | 'workspaceScore'
  | 'comfortScore'
  | 'freeSpace'
  | 'focusScore'

export type Metrics = Record<MetricKey, number>

export type OptimizationMemory = {
  beforeFurniture: FurnitureItem[]
  beforeMetrics: Metrics
}
