import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Armchair,
  BedDouble,
  BookOpen,
  BrainCircuit,
  Check,
  Download,
  Laptop,
  Monitor,
  Move,
  Plus,
  Play,
  RefreshCw,
  RotateCw,
  Ruler,
  SlidersHorizontal,
  Sofa,
  Sparkles,
  Share2,
  Trash2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { RoomCanvas } from './components/RoomCanvas'
import { MetricCard } from './components/MetricCard'
import { furnitureTemplates } from './data/furniture'
import { metricCopy, metricKeys } from './data/metrics'
import { useLayoutStore } from './store/layoutStore'
import type { FurnitureType, Metrics } from './types'

const iconMap: Record<FurnitureType, typeof BedDouble> = {
  bed: BedDouble,
  desk: Laptop,
  chair: Armchair,
  sofa: Sofa,
  monitor: Monitor,
  shelf: BookOpen,
}

function App() {
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [exportNonce, setExportNonce] = useState(0)
  const [demoRunning, setDemoRunning] = useState(false)
  const demoTimers = useRef<number[]>([])
  const room = useLayoutStore((state) => state.room)
  const furnitures = useLayoutStore((state) => state.furnitures)
  const selectedFurniture = useLayoutStore((state) =>
    state.furnitures.find((item) => item.id === state.selectedId),
  )
  const metrics = useLayoutStore((state) => state.metrics)
  const lastOptimization = useLayoutStore((state) => state.lastOptimization)
  const optimizing = useLayoutStore((state) => state.optimizing)
  const addFurniture = useLayoutStore((state) => state.addFurniture)
  const setRoomDimension = useLayoutStore((state) => state.setRoomDimension)
  const rotateSelected = useLayoutStore((state) => state.rotateSelected)
  const removeSelected = useLayoutStore((state) => state.removeSelected)
  const optimize = useLayoutStore((state) => state.optimize)
  const makeMessyRoom = useLayoutStore((state) => state.makeMessyRoom)
  const randomize = useLayoutStore((state) => state.randomize)
  const reset = useLayoutStore((state) => state.reset)

  const totalScore = Math.round(
    metricKeys.reduce((sum, key) => sum + metrics[key], 0) / metricKeys.length,
  )
  const previousTotalScore = lastOptimization
    ? averageScore(lastOptimization.beforeMetrics)
    : null
  const totalDelta = previousTotalScore === null ? 0 : totalScore - previousTotalScore
  const suggestions = useMemo(() => createSuggestions(metrics, totalDelta), [metrics, totalDelta])
  const shareText = useMemo(
    () =>
      [
        `Room Layout AI score: ${totalScore}${totalDelta ? ` (${formatDelta(totalDelta)})` : ''}`,
        `Room: ${(room.width / 100).toFixed(1)}m x ${(room.height / 100).toFixed(1)}m`,
        `Furniture: ${furnitures.map((item) => item.label).join(', ')}`,
        'Optimized with Spatial AI Playground.',
      ].join('\n'),
    [furnitures, room.height, room.width, totalDelta, totalScore],
  )

  const copyShareText = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText)
      } else {
        copyWithTextarea(shareText)
      }
    } catch {
      copyWithTextarea(shareText)
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const requestPngExport = useCallback(() => {
    setExported(false)
    setExportNonce((current) => current + 1)
  }, [])

  const handlePngExported = useCallback(() => {
    setExported(true)
    window.setTimeout(() => setExported(false), 1600)
  }, [])

  const runDemo = useCallback(() => {
    demoTimers.current.forEach((timer) => window.clearTimeout(timer))
    setDemoRunning(true)
    makeMessyRoom()
    demoTimers.current = [
      window.setTimeout(() => optimize(), 520),
      window.setTimeout(() => setDemoRunning(false), 1900),
    ]
  }, [makeMessyRoom, optimize])

  useEffect(() => {
    return () => {
      demoTimers.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <BrainCircuit className="h-4 w-4 text-cyan-600" />
              Spatial AI Playground
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
              Room Layout AI
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span className="font-medium text-slate-600">AI Score</span>
              <span className="tabular-nums font-semibold text-slate-950">
                {totalScore}
              </span>
              {totalDelta !== 0 ? (
                <span
                  className={
                    totalDelta > 0
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700'
                      : 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-700'
                  }
                >
                  {formatDelta(totalDelta)}
                </span>
              ) : null}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={runDemo}
              disabled={demoRunning}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-80"
            >
              {demoRunning ? <Sparkles className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {demoRunning ? 'Running Demo' : 'Run Demo'}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={makeMessyRoom}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <RefreshCw className="h-4 w-4 text-slate-700" />
              Messy Room
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={optimize}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <Sparkles className={optimizing ? 'h-4 w-4 animate-spin text-cyan-600' : 'h-4 w-4 text-slate-700'} />
              Optimize
            </motion.button>
            <button
              type="button"
              onClick={requestPngExport}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              {exported ? <Check className="h-4 w-4 text-emerald-600" /> : <Download className="h-4 w-4 text-slate-700" />}
              {exported ? 'PNG Saved' : 'Export PNG'}
            </button>
          </div>
        </header>

        <main className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[292px_minmax(0,1fr)_316px]">
          <aside className="order-2 min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:order-1">
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Ruler className="h-4 w-4 text-cyan-600" />
                Room size
              </div>
              <div className="space-y-4">
                <DimensionSlider
                  label="Width"
                  value={room.width}
                  min={420}
                  max={760}
                  onChange={(value) => setRoomDimension('width', value)}
                />
                <DimensionSlider
                  label="Depth"
                  value={room.height}
                  min={320}
                  max={560}
                  onChange={(value) => setRoomDimension('height', value)}
                />
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Plus className="h-4 w-4 text-cyan-600" />
                Furniture
              </div>
              <div className="grid grid-cols-2 gap-2">
                {furnitureTemplates.map((template) => {
                  const Icon = iconMap[template.type]

                  return (
                    <button
                      key={template.type}
                      type="button"
                      onClick={() => addFurniture(template.type)}
                      className="group flex h-[76px] flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
                    >
                      <Icon className="h-5 w-5 text-slate-700 transition group-hover:text-cyan-700" />
                      <span className="text-sm font-medium text-slate-900">
                        {template.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
                <SlidersHorizontal className="h-4 w-4 text-cyan-600" />
                Selection
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                {selectedFurniture ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {selectedFurniture.label}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Move className="h-3.5 w-3.5" />
                        <span>
                          {Math.round(selectedFurniture.x)}, {Math.round(selectedFurniture.y)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => rotateSelected(90)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:border-slate-300"
                      >
                        <RotateCw className="h-4 w-4" />
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={removeSelected}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-100 bg-white text-sm font-medium text-red-600 transition hover:border-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[104px] items-center justify-center text-center text-sm text-slate-500">
                    Select a furniture block on the room map.
                  </div>
                )}
              </div>
            </section>

            <section className="mt-7 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={randomize}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:border-slate-300"
              >
                <RefreshCw className="h-4 w-4" />
                Shuffle
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:border-slate-300"
              >
                Reset
              </button>
            </section>
          </aside>

          <section className="order-1 min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:min-h-[560px] sm:p-4 lg:order-2">
            <RoomCanvas exportNonce={exportNonce} onExported={handlePngExported} />
          </section>

          <aside className="order-3 min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">Optimization</div>
                <div className="mt-1 text-xs text-slate-500">Live spatial scoring</div>
              </div>
              <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                Heuristic AI
              </div>
            </div>

            <BeforeAfterPanel
              beforeMetrics={lastOptimization?.beforeMetrics}
              afterMetrics={metrics}
            />

            <div className="space-y-3">
              {metricKeys.map((key) => (
                <MetricCard
                  key={key}
                  label={metricCopy[key].label}
                  value={metrics[key]}
                  delta={
                    lastOptimization ? metrics[key] - lastOptimization.beforeMetrics[key] : undefined
                  }
                  accent={metricCopy[key].accent}
                />
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BrainCircuit className="h-4 w-4 text-cyan-300" />
                AI suggestions
              </div>
              <div className="mt-3 space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm leading-5 text-slate-200"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Sparkles className="h-4 w-4 text-cyan-600" />
                Optimizer intent
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <IntentLine label="Door clearance" active={metrics.walkingEfficiency > 72} />
                <IntentLine label="Wall-aligned desk" active={metrics.workspaceScore > 76} />
                <IntentLine label="Open center path" active={metrics.freeSpace > 70} />
              </div>
            </div>

            <button
              type="button"
              onClick={copyShareText}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:shadow-sm"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'Copied Summary' : 'Copy Layout Summary'}
            </button>
          </aside>
        </main>
      </div>
    </div>
  )
}

type BeforeAfterPanelProps = {
  beforeMetrics?: Metrics
  afterMetrics: Metrics
}

function BeforeAfterPanel({ beforeMetrics, afterMetrics }: BeforeAfterPanelProps) {
  const beforeScore = beforeMetrics ? averageScore(beforeMetrics) : null
  const afterScore = averageScore(afterMetrics)
  const delta = beforeScore === null ? 0 : afterScore - beforeScore
  const highlights = beforeMetrics ? createImprovementHighlights(beforeMetrics, afterMetrics) : []

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">Before / After</div>
        {beforeScore !== null ? (
          <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-700">
            {formatDelta(delta)} improved
          </div>
        ) : (
          <div className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">
            Waiting
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <ScoreTile label="Before" value={beforeScore} muted />
        <div className="text-sm font-semibold text-slate-400">{'->'}</div>
        <ScoreTile label="After" value={afterScore} />
      </div>

      {beforeMetrics ? (
        <div className="mt-3 space-y-2">
          {highlights.map((highlight) => (
            <div
              key={highlight.label}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">{highlight.label}</span>
              <span
                className={
                  highlight.delta >= 0
                    ? 'font-semibold tabular-nums text-emerald-700'
                    : 'font-semibold tabular-nums text-rose-700'
                }
              >
                {formatDelta(highlight.delta)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm leading-5 text-slate-500">
          Run Demo or Optimize to generate a visible comparison.
        </div>
      )}
    </div>
  )
}

type ScoreTileProps = {
  label: string
  value: number | null
  muted?: boolean
}

function ScoreTile({ label, value, muted = false }: ScoreTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div
        className={
          muted
            ? 'mt-1 text-2xl font-semibold tabular-nums text-slate-500'
            : 'mt-1 text-2xl font-semibold tabular-nums text-slate-950'
        }
      >
        {value ?? '--'}
      </div>
    </div>
  )
}

function createImprovementHighlights(before: Metrics, after: Metrics) {
  return [
    {
      label: 'Door path',
      delta: after.walkingEfficiency - before.walkingEfficiency,
    },
    {
      label: 'Work zone',
      delta: after.workspaceScore - before.workspaceScore,
    },
    {
      label: 'Open space',
      delta: after.freeSpace - before.freeSpace,
    },
  ]
}

function averageScore(metrics: Metrics) {
  return Math.round(metricKeys.reduce((sum, key) => sum + metrics[key], 0) / metricKeys.length)
}

function formatDelta(delta: number) {
  return `${delta > 0 ? '+' : ''}${delta}`
}

function createSuggestions(metrics: Metrics, totalDelta: number) {
  if (totalDelta > 18) {
    return [
      'Major layout gain detected: traffic paths are cleaner and the desk is closer to a wall.',
      'Keep the center zone open for navigation, robots, and future AR placement.',
      'This layout is ready for a shareable before-after demo.',
    ]
  }

  if (metrics.workspaceScore > 76) {
    return [
      'Workspace cluster is strong: desk, chair, and monitor are behaving like one station.',
      'Next improvement: separate rest and focus zones more clearly.',
      'Try widening the room and optimizing again for a bigger movement reveal.',
    ]
  }

  if (metrics.walkingEfficiency < 55) {
    return [
      'Path quality is low: clear the door zone and avoid furniture in the room center.',
      'Run Optimize to push large furniture to the walls.',
      'The heuristic prefers a clear route from the entrance to the workspace.',
    ]
  }

  return [
    'Layout is balanced, but there is still room for a cleaner center path.',
    'Optimize will prioritize door clearance, wall alignment, and collision removal.',
    'Shuffle first for a more dramatic AI movement demo.',
  ]
}

function copyWithTextarea(text: string) {
  const textarea = document.createElement('textarea')

  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

type DimensionSliderProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function DimensionSlider({ label, value, min, max, onChange }: DimensionSliderProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{(value / 100).toFixed(1)} m</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={20}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-cyan-600"
      />
    </label>
  )
}

type IntentLineProps = {
  label: string
  active: boolean
}

function IntentLine({ label, active }: IntentLineProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span
        className={
          active
            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'
            : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500'
        }
      >
        {active ? 'Clear' : 'Tuning'}
      </span>
    </div>
  )
}

export default App
