import { useEffect, useMemo, useRef, useState } from 'react'
import Konva from 'konva'
import { Arc, Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { motion } from 'framer-motion'
import { DoorOpen, Sparkles } from 'lucide-react'
import { clamp, getDoorZone } from '../lib/geometry'
import { useLayoutStore } from '../store/layoutStore'
import type { FurnitureItem } from '../types'

type RoomCanvasProps = {
  exportNonce: number
  onExported: () => void
}

export function RoomCanvas({ exportNonce, onExported }: RoomCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [wrapperWidth, setWrapperWidth] = useState(360)
  const room = useLayoutStore((state) => state.room)
  const furnitures = useLayoutStore((state) => state.furnitures)
  const selectedId = useLayoutStore((state) => state.selectedId)
  const lastOptimization = useLayoutStore((state) => state.lastOptimization)
  const optimizing = useLayoutStore((state) => state.optimizing)
  const selectFurniture = useLayoutStore((state) => state.selectFurniture)
  const updateFurniture = useLayoutStore((state) => state.updateFurniture)

  useEffect(() => {
    const element = wrapperRef.current

    if (!element) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setWrapperWidth(entry.contentRect.width)
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const scale = Math.min((wrapperWidth - 8) / room.width, 1.18)
  const stageWidth = room.width * scale
  const stageHeight = room.height * scale
  const doorZone = getDoorZone(room)
  const floorLines = useMemo(() => createFloorLines(room.width, room.height), [room.width, room.height])

  useEffect(() => {
    if (exportNonce === 0) {
      return
    }

    const timeout = window.setTimeout(() => {
      const stage = stageRef.current

      if (!stage) {
        return
      }

      const dataUrl = stage.toDataURL({
        mimeType: 'image/png',
        pixelRatio: 3,
      })
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

      link.href = dataUrl
      link.download = `room-layout-ai-${timestamp}.png`
      document.body.append(link)
      link.click()
      link.remove()
      onExported()
    }, 80)

    return () => window.clearTimeout(timeout)
  }, [exportNonce, onExported])

  const handleStagePointer = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (event.target === event.target.getStage()) {
      selectFurniture(null)
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex h-full min-h-[360px] w-full min-w-0 items-start justify-center overflow-hidden rounded-lg bg-[#f8fafc] px-1 pb-4 pt-20 sm:min-h-[520px] sm:px-4 sm:pb-6">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
        <DoorOpen className="h-3.5 w-3.5 text-cyan-700" />
        Door clearance zone
      </div>

      {optimizing ? (
        <motion.div
          className="pointer-events-none absolute inset-x-8 top-20 z-20 h-1 rounded-full bg-cyan-400 shadow-[0_0_22px_rgba(34,211,238,0.65)]"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: stageHeight - 110, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.05, ease: 'easeInOut' }}
        />
      ) : null}

      {optimizing ? (
        <div className="pointer-events-none absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 animate-spin" />
          Optimizing
        </div>
      ) : null}

      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        className="rounded-lg shadow-2xl shadow-slate-200/80"
        onMouseDown={handleStagePointer}
        onTouchStart={handleStagePointer}
      >
        <Layer scaleX={scale} scaleY={scale}>
          <RoomArchitecture roomWidth={room.width} roomHeight={room.height} doorZone={doorZone} floorLines={floorLines} />

          {lastOptimization
            ? lastOptimization.beforeFurniture.map((beforeItem) => {
                const afterItem = furnitures.find((item) => item.id === beforeItem.id)

                if (!afterItem) {
                  return null
                }

                return <MovementTrail key={beforeItem.id} beforeItem={beforeItem} afterItem={afterItem} />
              })
            : null}

          {furnitures.map((item) => (
            <FurnitureNode
              key={item.id}
              item={item}
              roomWidth={room.width}
              roomHeight={room.height}
              selected={selectedId === item.id}
              onSelect={() => selectFurniture(item.id)}
              onChange={(patch) => updateFurniture(item.id, patch)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

type FloorLine = {
  key: string
  points: number[]
  opacity: number
}

type RoomArchitectureProps = {
  roomWidth: number
  roomHeight: number
  doorZone: ReturnType<typeof getDoorZone>
  floorLines: FloorLine[]
}

function RoomArchitecture({ roomWidth, roomHeight, doorZone, floorLines }: RoomArchitectureProps) {
  const windowStart = roomWidth - 260
  const windowEnd = roomWidth - 74
  const hingeX = doorZone.x + 28
  const hingeY = roomHeight - 6

  return (
    <>
      <Rect
        width={roomWidth}
        height={roomHeight}
        fill="#fffdfa"
        stroke="#d8dee9"
        strokeWidth={1}
        cornerRadius={22}
        listening={false}
      />
      <Rect
        x={22}
        y={22}
        width={roomWidth - 44}
        height={roomHeight - 44}
        fill="#fbfaf7"
        cornerRadius={18}
        listening={false}
      />

      {floorLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          stroke="#efe7d8"
          strokeWidth={1}
          opacity={line.opacity}
          listening={false}
        />
      ))}

      <Rect
        x={roomWidth - 238}
        y={24}
        width={198}
        height={124}
        fill="#ecfeff"
        opacity={0.38}
        cornerRadius={22}
        listening={false}
      />
      <Rect
        x={roomWidth - 200}
        y={roomHeight - 124}
        width={160}
        height={88}
        fill="#fef3c7"
        opacity={0.48}
        cornerRadius={28}
        listening={false}
      />

      <Rect
        x={doorZone.x}
        y={doorZone.y}
        width={doorZone.width}
        height={doorZone.height}
        fill="rgba(6, 182, 212, 0.08)"
        stroke="#67e8f9"
        dash={[8, 8]}
        cornerRadius={12}
        listening={false}
      />

      <Line
        points={[22, 5, roomWidth - 22, 5]}
        stroke="#0f172a"
        strokeWidth={8}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[5, 22, 5, roomHeight - 22]}
        stroke="#0f172a"
        strokeWidth={8}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[roomWidth - 5, 22, roomWidth - 5, roomHeight - 22]}
        stroke="#0f172a"
        strokeWidth={8}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[22, roomHeight - 5, doorZone.x + 8, roomHeight - 5]}
        stroke="#0f172a"
        strokeWidth={8}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[doorZone.x + doorZone.width + 8, roomHeight - 5, roomWidth - 22, roomHeight - 5]}
        stroke="#0f172a"
        strokeWidth={8}
        lineCap="round"
        listening={false}
      />

      <Line
        points={[windowStart, 5, windowEnd, 5]}
        stroke="#67e8f9"
        strokeWidth={9}
        lineCap="round"
        listening={false}
      />
      <Text
        x={windowStart + 56}
        y={18}
        text="Window"
        fill="#64748b"
        fontSize={11}
        fontStyle="bold"
        listening={false}
      />

      <Arc
        x={hingeX}
        y={hingeY}
        innerRadius={72}
        outerRadius={74}
        angle={86}
        rotation={-90}
        fill="#67e8f9"
        opacity={0.42}
        listening={false}
      />
      <Line
        points={[hingeX, hingeY, hingeX, roomHeight - 86]}
        stroke="#0f172a"
        strokeWidth={4}
        lineCap="round"
        listening={false}
      />
      <Text
        x={doorZone.x + 42}
        y={roomHeight - 36}
        text="Entry"
        fill="#64748b"
        fontSize={11}
        fontStyle="bold"
        listening={false}
      />
    </>
  )
}

type MovementTrailProps = {
  beforeItem: FurnitureItem
  afterItem: FurnitureItem
}

function MovementTrail({ beforeItem, afterItem }: MovementTrailProps) {
  const startX = beforeItem.x + beforeItem.width / 2
  const startY = beforeItem.y + beforeItem.height / 2
  const endX = afterItem.x + afterItem.width / 2
  const endY = afterItem.y + afterItem.height / 2
  const distance = Math.hypot(endX - startX, endY - startY)

  if (distance < 8 && beforeItem.rotation === afterItem.rotation) {
    return null
  }

  return (
    <Group listening={false} opacity={0.42}>
      <Group x={startX} y={startY} rotation={beforeItem.rotation}>
        <Rect
          x={-beforeItem.width / 2}
          y={-beforeItem.height / 2}
          width={beforeItem.width}
          height={beforeItem.height}
          fill={beforeItem.fill}
          stroke={beforeItem.stroke}
          strokeWidth={2}
          dash={[8, 8]}
          cornerRadius={14}
          opacity={0.5}
        />
      </Group>
      <Arrow
        points={[startX, startY, endX, endY]}
        pointerLength={12}
        pointerWidth={12}
        fill={afterItem.stroke}
        stroke={afterItem.stroke}
        strokeWidth={3}
        dash={[7, 8]}
        lineCap="round"
        opacity={0.8}
      />
      <Circle x={endX} y={endY} radius={5} fill="#0f172a" opacity={0.72} />
    </Group>
  )
}

type FurnitureNodeProps = {
  item: FurnitureItem
  roomWidth: number
  roomHeight: number
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<Pick<FurnitureItem, 'x' | 'y' | 'rotation'>>) => void
}

function FurnitureNode({
  item,
  roomWidth,
  roomHeight,
  selected,
  onSelect,
  onChange,
}: FurnitureNodeProps) {
  const groupRef = useRef<Konva.Group>(null)

  useEffect(() => {
    const node = groupRef.current

    if (!node || node.isDragging()) {
      return
    }

    const tween = new Konva.Tween({
      node,
      x: item.x + item.width / 2,
      y: item.y + item.height / 2,
      rotation: item.rotation,
      duration: 0.82,
      easing: Konva.Easings.EaseInOut,
    })

    tween.play()

    return () => tween.destroy()
  }, [item.height, item.rotation, item.width, item.x, item.y])

  const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
    const node = event.target
    const halfWidth = item.width / 2
    const halfHeight = item.height / 2

    node.x(clamp(node.x(), halfWidth + 8, roomWidth - halfWidth - 8))
    node.y(clamp(node.y(), halfHeight + 8, roomHeight - halfHeight - 8))
  }

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const node = event.target

    onChange({
      x: node.x() - item.width / 2,
      y: node.y() - item.height / 2,
    })
  }

  return (
    <Group
      ref={groupRef}
      x={item.x + item.width / 2}
      y={item.y + item.height / 2}
      rotation={item.rotation}
      draggable
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-item.width / 2}
        y={-item.height / 2}
        width={item.width}
        height={item.height}
        fill={item.fill}
        stroke={selected ? '#0f172a' : item.stroke}
        strokeWidth={selected ? 3 : 2}
        cornerRadius={14}
        shadowColor={selected ? '#0f172a' : '#94a3b8'}
        shadowBlur={selected ? 20 : 7}
        shadowOpacity={selected ? 0.2 : 0.1}
        shadowOffsetY={selected ? 8 : 4}
      />
      <FurnitureDetails item={item} />
      <Text
        x={-item.width / 2}
        y={-8}
        width={item.width}
        text={item.label}
        align="center"
        fill="#0f172a"
        fontSize={13}
        fontStyle="bold"
        listening={false}
      />
    </Group>
  )
}

function FurnitureDetails({ item }: { item: FurnitureItem }) {
  if (item.type === 'bed') {
    return (
      <>
        <Rect
          x={-item.width / 2 + 10}
          y={-item.height / 2 + 10}
          width={34}
          height={item.height - 20}
          fill="#eff6ff"
          cornerRadius={9}
          listening={false}
        />
        <Line
          points={[-item.width / 2 + 52, -item.height / 2 + 14, item.width / 2 - 12, item.height / 2 - 14]}
          stroke="#93c5fd"
          strokeWidth={2}
          listening={false}
        />
      </>
    )
  }

  if (item.type === 'desk') {
    return (
      <>
        <Line
          points={[-item.width / 2 + 12, -item.height / 2 + 16, item.width / 2 - 12, -item.height / 2 + 16]}
          stroke="#0f766e"
          strokeWidth={3}
          lineCap="round"
          listening={false}
        />
        <Rect
          x={item.width / 2 - 24}
          y={-item.height / 2 + 22}
          width={12}
          height={18}
          fill="#99f6e4"
          cornerRadius={4}
          listening={false}
        />
      </>
    )
  }

  if (item.type === 'chair') {
    return (
      <>
        <Circle x={0} y={0} radius={13} fill="#fbbf24" opacity={0.5} listening={false} />
        <Line points={[-14, 16, 14, 16]} stroke="#d97706" strokeWidth={3} lineCap="round" listening={false} />
      </>
    )
  }

  if (item.type === 'sofa') {
    return (
      <>
        <Rect
          x={-item.width / 2 + 12}
          y={-item.height / 2 + 12}
          width={(item.width - 34) / 2}
          height={item.height - 24}
          fill="#fff1f2"
          cornerRadius={9}
          listening={false}
        />
        <Rect
          x={2}
          y={-item.height / 2 + 12}
          width={(item.width - 34) / 2}
          height={item.height - 24}
          fill="#fff1f2"
          cornerRadius={9}
          listening={false}
        />
      </>
    )
  }

  if (item.type === 'monitor') {
    return (
      <>
        <Rect
          x={-item.width / 2 + 8}
          y={-item.height / 2 + 6}
          width={item.width - 16}
          height={item.height - 12}
          fill="#1e293b"
          cornerRadius={4}
          listening={false}
        />
        <Line points={[0, item.height / 2 - 6, 0, item.height / 2 + 5]} stroke="#4f46e5" strokeWidth={2} listening={false} />
      </>
    )
  }

  return (
    <>
      <Line
        points={[-item.width / 2 + 10, -8, item.width / 2 - 10, -8]}
        stroke="#94a3b8"
        strokeWidth={2}
        listening={false}
      />
      <Line
        points={[-item.width / 2 + 10, 8, item.width / 2 - 10, 8]}
        stroke="#94a3b8"
        strokeWidth={2}
        listening={false}
      />
    </>
  )
}

function createFloorLines(width: number, height: number): FloorLine[] {
  const lines: FloorLine[] = []
  const gap = 34

  for (let x = gap; x < width; x += gap) {
    lines.push({ key: `v-${x}`, points: [x, 18, x, height - 18], opacity: 0.42 })
  }

  for (let y = gap; y < height; y += gap) {
    lines.push({ key: `h-${y}`, points: [18, y, width - 18, y], opacity: 0.28 })
  }

  return lines
}
