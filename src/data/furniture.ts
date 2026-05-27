import type { FurnitureItem, FurnitureTemplate, Room } from '../types'

export const initialRoom: Room = {
  width: 620,
  height: 440,
}

export const furnitureTemplates: FurnitureTemplate[] = [
  {
    type: 'bed',
    label: 'Bed',
    width: 138,
    height: 92,
    fill: '#dbeafe',
    stroke: '#60a5fa',
  },
  {
    type: 'desk',
    label: 'Desk',
    width: 118,
    height: 54,
    fill: '#ccfbf1',
    stroke: '#14b8a6',
  },
  {
    type: 'chair',
    label: 'Chair',
    width: 46,
    height: 46,
    fill: '#fef3c7',
    stroke: '#f59e0b',
  },
  {
    type: 'sofa',
    label: 'Sofa',
    width: 132,
    height: 62,
    fill: '#ffe4e6',
    stroke: '#fb7185',
  },
  {
    type: 'monitor',
    label: 'Monitor',
    width: 46,
    height: 28,
    fill: '#e0e7ff',
    stroke: '#818cf8',
  },
  {
    type: 'shelf',
    label: 'Shelf',
    width: 94,
    height: 38,
    fill: '#f1f5f9',
    stroke: '#64748b',
  },
]

const templateByType = new Map(furnitureTemplates.map((item) => [item.type, item]))

export const initialFurniture: FurnitureItem[] = [
  createFurniture('bed', 'bed-1', 238, 178, 0),
  createFurniture('desk', 'desk-1', 286, 158, 0),
  createFurniture('chair', 'chair-1', 330, 224, 0),
  createFurniture('sofa', 'sofa-1', 82, 292, 0),
  createFurniture('monitor', 'monitor-1', 318, 174, 0),
  createFurniture('shelf', 'shelf-1', 32, 326, 0),
]

export function createFurniture(
  type: FurnitureTemplate['type'],
  id: string,
  x: number,
  y: number,
  rotation = 0,
): FurnitureItem {
  const template = templateByType.get(type)

  if (!template) {
    throw new Error(`Unknown furniture type: ${type}`)
  }

  return {
    ...template,
    id,
    x,
    y,
    rotation,
  }
}
