import { create } from 'zustand'
import { createFurniture, furnitureTemplates, initialFurniture, initialRoom } from '../data/furniture'
import { clamp, clampItemToRoom } from '../lib/geometry'
import { calculateMetrics, optimizeFurniture } from '../lib/optimizer'
import type { FurnitureItem, FurnitureType, Metrics, OptimizationMemory, Room } from '../types'

type LayoutStore = {
  room: Room
  furnitures: FurnitureItem[]
  metrics: Metrics
  lastOptimization: OptimizationMemory | null
  selectedId: string | null
  optimizing: boolean
  addFurniture: (type: FurnitureType) => void
  updateFurniture: (id: string, patch: Partial<Pick<FurnitureItem, 'x' | 'y' | 'rotation'>>) => void
  selectFurniture: (id: string | null) => void
  setRoomDimension: (dimension: keyof Room, value: number) => void
  rotateSelected: (delta: number) => void
  removeSelected: () => void
  optimize: () => void
  randomize: () => void
  reset: () => void
}

const optimizeDuration = 1120

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  room: initialRoom,
  furnitures: initialFurniture,
  metrics: calculateMetrics(initialFurniture, initialRoom),
  lastOptimization: null,
  selectedId: null,
  optimizing: false,
  addFurniture: (type) => {
    const state = get()
    const template = furnitureTemplates.find((item) => item.type === type)

    if (!template) {
      return
    }

    const count = state.furnitures.filter((item) => item.type === type).length
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${type}-${Date.now()}-${count}`
    const nextItem = clampItemToRoom(
      createFurniture(
        type,
        id,
        state.room.width / 2 - template.width / 2 + count * 16,
        state.room.height / 2 - template.height / 2 + count * 16,
      ),
      state.room,
    )
    const furnitures = [...state.furnitures, nextItem]

    set({
      furnitures,
      selectedId: nextItem.id,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, state.room),
    })
  },
  updateFurniture: (id, patch) => {
    const state = get()
    const furnitures = state.furnitures.map((item) =>
      item.id === id ? clampItemToRoom({ ...item, ...patch }, state.room) : item,
    )

    set({
      furnitures,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, state.room),
    })
  },
  selectFurniture: (id) => {
    set({ selectedId: id })
  },
  setRoomDimension: (dimension, value) => {
    const state = get()
    const room = {
      ...state.room,
      [dimension]: value,
    }
    const furnitures = state.furnitures.map((item) => clampItemToRoom(item, room))

    set({
      room,
      furnitures,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, room),
    })
  },
  rotateSelected: (delta) => {
    const state = get()

    if (!state.selectedId) {
      return
    }

    const furnitures = state.furnitures.map((item) =>
      item.id === state.selectedId
        ? clampItemToRoom({ ...item, rotation: (item.rotation + delta) % 360 }, state.room)
        : item,
    )

    set({
      furnitures,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, state.room),
    })
  },
  removeSelected: () => {
    const state = get()

    if (!state.selectedId) {
      return
    }

    const furnitures = state.furnitures.filter((item) => item.id !== state.selectedId)

    set({
      furnitures,
      selectedId: null,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, state.room),
    })
  },
  optimize: () => {
    const state = get()
    const beforeFurniture = state.furnitures.map((item) => ({ ...item }))
    const beforeMetrics = { ...state.metrics }
    const furnitures = optimizeFurniture(state.furnitures, state.room)

    set({
      optimizing: true,
      selectedId: null,
      furnitures,
      lastOptimization: {
        beforeFurniture,
        beforeMetrics,
      },
      metrics: calculateMetrics(furnitures, state.room),
    })

    window.setTimeout(() => {
      set({ optimizing: false })
    }, optimizeDuration)
  },
  randomize: () => {
    const state = get()
    const furnitures = state.furnitures.map((item, index) => {
      const rotation = index % 3 === 0 ? 90 : index % 4 === 0 ? 270 : 0

      return clampItemToRoom(
        {
          ...item,
          x: clamp(66 + ((index * 91) % Math.max(160, state.room.width - 170)), 20, state.room.width - item.width - 20),
          y: clamp(54 + ((index * 73) % Math.max(140, state.room.height - 150)), 20, state.room.height - item.height - 20),
          rotation,
        },
        state.room,
      )
    })

    set({
      furnitures,
      selectedId: null,
      lastOptimization: null,
      metrics: calculateMetrics(furnitures, state.room),
    })
  },
  reset: () => {
    set({
      room: initialRoom,
      furnitures: initialFurniture,
      selectedId: null,
      optimizing: false,
      lastOptimization: null,
      metrics: calculateMetrics(initialFurniture, initialRoom),
    })
  },
}))
