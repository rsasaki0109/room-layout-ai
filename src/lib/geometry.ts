import type { FurnitureItem, Room } from '../types'

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360
}

export function rotatedSize(item: Pick<FurnitureItem, 'width' | 'height' | 'rotation'>) {
  const rotation = normalizeRotation(item.rotation)
  const quarterTurn = rotation === 90 || rotation === 270

  return {
    width: quarterTurn ? item.height : item.width,
    height: quarterTurn ? item.width : item.height,
  }
}

export function getBounds(item: FurnitureItem): Bounds {
  const size = rotatedSize(item)
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2

  return {
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    width: size.width,
    height: size.height,
  }
}

export function intersects(a: Bounds, b: Bounds, gap = 0) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  )
}

export function distanceBetween(a: FurnitureItem, b: FurnitureItem) {
  const ax = a.x + a.width / 2
  const ay = a.y + a.height / 2
  const bx = b.x + b.width / 2
  const by = b.y + b.height / 2

  return Math.hypot(ax - bx, ay - by)
}

export function getDoorZone(room: Room): Bounds {
  return {
    x: 20,
    y: room.height - 86,
    width: 148,
    height: 86,
  }
}

export function clampItemToRoom(item: FurnitureItem, room: Room): FurnitureItem {
  const size = rotatedSize(item)
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2
  const nextCenterX = clamp(centerX, size.width / 2 + 8, room.width - size.width / 2 - 8)
  const nextCenterY = clamp(centerY, size.height / 2 + 8, room.height - size.height / 2 - 8)

  return {
    ...item,
    x: nextCenterX - item.width / 2,
    y: nextCenterY - item.height / 2,
  }
}

export function shouldIgnoreCollision(a: FurnitureItem, b: FurnitureItem) {
  return (
    (a.type === 'monitor' && b.type === 'desk') ||
    (a.type === 'desk' && b.type === 'monitor')
  )
}
