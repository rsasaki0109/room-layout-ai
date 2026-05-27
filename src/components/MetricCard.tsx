import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

type MetricCardProps = {
  label: string
  value: number
  delta?: number
  accent: string
}

export function MetricCard({ label, value, delta, accent }: MetricCardProps) {
  const spring = useSpring(value, { stiffness: 120, damping: 22, mass: 0.6 })
  const display = useTransform(spring, (latest) => Math.round(latest))

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-baseline gap-2">
          {typeof delta === 'number' && delta !== 0 ? (
            <motion.span
              className={
                delta > 0
                  ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700'
                  : 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-700'
              }
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            >
              {delta > 0 ? '+' : ''}
              {delta}
            </motion.span>
          ) : null}
          <motion.span className="tabular-nums text-lg font-semibold text-slate-950">
            {display}
          </motion.span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accent }}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  )
}
