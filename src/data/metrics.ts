import type { MetricKey } from '../types'

export const metricKeys: MetricKey[] = [
  'walkingEfficiency',
  'workspaceScore',
  'comfortScore',
  'freeSpace',
  'focusScore',
]

export const metricCopy: Record<MetricKey, { label: string; accent: string }> = {
  walkingEfficiency: {
    label: 'Walking Efficiency',
    accent: '#0891b2',
  },
  workspaceScore: {
    label: 'Workspace Score',
    accent: '#7c3aed',
  },
  comfortScore: {
    label: 'Comfort Score',
    accent: '#e11d48',
  },
  freeSpace: {
    label: 'Free Space',
    accent: '#059669',
  },
  focusScore: {
    label: 'Focus Score',
    accent: '#d97706',
  },
}
