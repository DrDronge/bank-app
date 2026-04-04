import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  sub?: string
  subPositive?: boolean
  color?: 'default' | 'green' | 'red' | 'blue'
}

const colorMap = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  blue: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
}

export default function StatCard({ label, value, icon, sub, subPositive, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
          {sub !== undefined && (
            <p className={`text-xs mt-1 font-medium ${subPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {subPositive ? '↑' : '↓'} {sub} vs last month
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
