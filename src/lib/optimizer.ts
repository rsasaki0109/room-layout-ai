import type { FurnitureItem, FurnitureType, Metrics, Room } from '../types'
import {
  clamp,
  clampItemToRoom,
  distanceBetween,
  getBounds,
  getDoorZone,
  intersects,
  shouldIgnoreCollision,
} from './geometry'

type Candidate = {
  x: number
  y: number
  rotation: number
}

const priority: Record<FurnitureType, number> = {
  bed: 0,
  desk: 1,
  sofa: 2,
  shelf: 3,
  chair: 4,
  monitor: 5,
}

export function optimizeFurniture(items: FurnitureItem[], room: Room) {
  const sorted = [...items].sort((a, b) => priority[a.type] - priority[b.type])
  const placed: FurnitureItem[] = []
  const result = new Map<string, FurnitureItem>()

  for (const item of sorted) {
    const candidates = getCandidates(item, room, placed)
    const next = pickCandidate(item, room, placed, candidates)

    placed.push(next)
    result.set(item.id, next)
  }

  return items.map((item) => result.get(item.id) ?? item)
}

export function calculateMetrics(items: FurnitureItem[], room: Room): Metrics {
  const collisions = countCollisions(items)
  const doorBlocks = items.filter((item) => intersects(getBounds(item), getDoorZone(room))).length
  const occupiedArea = items.reduce((sum, item) => sum + item.width * item.height, 0)
  const freeRatio = clamp(1 - occupiedArea / (room.width * room.height), 0.25, 0.92)
  const freeSpace = clamp(Math.round(freeRatio * 100 - collisions * 4 - doorBlocks * 6), 24, 98)

  const desk = items.find((item) => item.type === 'desk')
  const chair = items.find((item) => item.type === 'chair')
  const monitor = items.find((item) => item.type === 'monitor')
  const bed = items.find((item) => item.type === 'bed')
  const sofa = items.find((item) => item.type === 'sofa')

  const wallAlignedDesk = desk ? isNearWall(desk, room, 34) : false
  const chairNearDesk = desk && chair ? distanceBetween(desk, chair) < 128 : false
  const monitorOnDesk = desk && monitor ? distanceBetween(desk, monitor) < 72 : false
  const bedAnchored = bed ? isNearWall(bed, room, 42) : false
  const sofaAnchored = sofa ? isNearWall(sofa, room, 42) : false
  const centerClear = items.filter((item) => isInCenter(item, room)).length <= 1

  const walkingEfficiency = clamp(
    Math.round(44 + freeSpace * 0.42 + (centerClear ? 16 : 0) - collisions * 13 - doorBlocks * 18),
    12,
    98,
  )
  const workspaceScore = clamp(
    Math.round(
      38 +
        (wallAlignedDesk ? 26 : 0) +
        (chairNearDesk ? 16 : 0) +
        (monitorOnDesk ? 15 : 0) -
        collisions * 8,
    ),
    10,
    98,
  )
  const comfortScore = clamp(
    Math.round(
      42 +
        (bedAnchored ? 19 : 0) +
        (sofaAnchored ? 16 : 0) +
        (freeSpace > 66 ? 12 : 0) -
        collisions * 9,
    ),
    14,
    98,
  )
  const focusScore = clamp(
    Math.round(
      39 +
        (wallAlignedDesk ? 20 : 0) +
        (chairNearDesk ? 13 : 0) +
        (centerClear ? 11 : 0) +
        (doorBlocks === 0 ? 10 : 0) -
        collisions * 9,
    ),
    12,
    98,
  )

  return {
    walkingEfficiency,
    workspaceScore,
    comfortScore,
    freeSpace,
    focusScore,
  }
}

function getCandidates(item: FurnitureItem, room: Room, placed: FurnitureItem[]): Candidate[] {
  const pad = 28
  const stagger = placed.filter((candidate) => candidate.type === item.type).length * 34
  const desk = placed.find((candidate) => candidate.type === 'desk')

  if (item.type === 'monitor' && desk) {
    return [
      {
        x: desk.x + desk.width / 2 - item.width / 2,
        y: desk.y + 12,
        rotation: desk.rotation,
      },
    ]
  }

  if (item.type === 'chair' && desk) {
    return [
      {
        x: desk.x + desk.width / 2 - item.width / 2,
        y: desk.y + desk.height + 18,
        rotation: 0,
      },
      {
        x: desk.x - item.width - 18,
        y: desk.y + 4,
        rotation: 0,
      },
      {
        x: desk.x + desk.width + 18,
        y: desk.y + 4,
        rotation: 0,
      },
    ]
  }

  const candidatesByType: Record<FurnitureType, Candidate[]> = {
    bed: [
      { x: pad + stagger, y: pad, rotation: 0 },
      { x: pad, y: room.height - item.height - pad - stagger, rotation: 0 },
      { x: room.width - item.width - pad, y: pad + stagger, rotation: 0 },
    ],
    desk: [
      { x: room.width - item.width - pad, y: pad + stagger, rotation: 0 },
      { x: room.width / 2 - item.width / 2, y: pad + stagger, rotation: 0 },
      { x: pad, y: pad + stagger, rotation: 0 },
      { x: room.width - item.height - pad, y: room.height / 2 - item.width / 2, rotation: 90 },
    ],
    chair: [
      { x: room.width / 2 - item.width / 2 + stagger, y: room.height / 2 + 26, rotation: 0 },
    ],
    sofa: [
      { x: room.width - item.width - pad, y: room.height - item.height - pad, rotation: 0 },
      { x: room.width / 2 - item.width / 2, y: room.height - item.height - pad, rotation: 0 },
      { x: pad, y: pad + stagger, rotation: 0 },
    ],
    monitor: [
      { x: room.width - item.width - pad - stagger, y: pad + 14, rotation: 0 },
    ],
    shelf: [
      { x: room.width - item.width - pad, y: room.height / 2 - item.height / 2 + stagger, rotation: 0 },
      { x: pad, y: room.height / 2 - item.height / 2 + stagger, rotation: 0 },
      { x: room.width / 2 - item.width / 2, y: pad + stagger, rotation: 0 },
    ],
  }

  return candidatesByType[item.type]
}

function pickCandidate(
  item: FurnitureItem,
  room: Room,
  placed: FurnitureItem[],
  candidates: Candidate[],
) {
  const doorZone = getDoorZone(room)
  const nudges = [0, 18, -18, 36, -36, 58, -58, 82, -82]

  for (const candidate of candidates) {
    for (const dx of nudges) {
      for (const dy of nudges) {
        const next = clampItemToRoom(
          {
            ...item,
            x: candidate.x + dx,
            y: candidate.y + dy,
            rotation: candidate.rotation,
          },
          room,
        )
        const bounds = getBounds(next)
        const clearsDoor = !intersects(bounds, doorZone)
        const clearsFurniture = placed.every(
          (other) => shouldIgnoreCollision(next, other) || !intersects(bounds, getBounds(other), 14),
        )

        if (clearsDoor && clearsFurniture) {
          return next
        }
      }
    }
  }

  return clampItemToRoom(
    {
      ...item,
      x: room.width / 2 - item.width / 2,
      y: room.height / 2 - item.height / 2,
      rotation: 0,
    },
    room,
  )
}

function countCollisions(items: FurnitureItem[]) {
  let count = 0

  for (let index = 0; index < items.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < items.length; otherIndex += 1) {
      const first = items[index]
      const second = items[otherIndex]

      if (!shouldIgnoreCollision(first, second) && intersects(getBounds(first), getBounds(second), 8)) {
        count += 1
      }
    }
  }

  return count
}

function isNearWall(item: FurnitureItem, room: Room, threshold: number) {
  const bounds = getBounds(item)

  return (
    bounds.x < threshold ||
    bounds.y < threshold ||
    room.width - (bounds.x + bounds.width) < threshold ||
    room.height - (bounds.y + bounds.height) < threshold
  )
}

function isInCenter(item: FurnitureItem, room: Room) {
  const bounds = getBounds(item)
  const centerZone = {
    x: room.width * 0.26,
    y: room.height * 0.24,
    width: room.width * 0.48,
    height: room.height * 0.52,
  }

  return intersects(bounds, centerZone)
}
