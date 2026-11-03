import React from 'react'

const COLORS = {
  blue:   { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    val: 'text-blue-400' },
  green:  { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', val: 'text-emerald-400' },
  yellow: { bg: 'bg-yellow-500/10',  icon: 'text-yellow-400',  val: 'text-yellow-400' },
  red:    { bg: 'bg-red-500/10',     icon: 'text-red-400',     val: 'text-red-400' },
}

export default function KPICard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const c = COLORS[color] ?? COLORS.blue
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <div className={`${c.bg} p-2 rounded-lg`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${c.val}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
