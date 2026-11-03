import React from 'react'

const MAP = {
  'Normal':             'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Regular':            'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Pronto p/ Troca':    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Pronto p/ Aferir':   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Ultrapassou Limite': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Vencido':            'bg-red-500/15 text-red-400 border-red-500/30',
  'Ativo':              'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Inativo':            'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'Sem Data':           'bg-gray-500/15 text-gray-400 border-gray-500/30',
  'Aberta':             'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Em Andamento':       'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Cancelada':          'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

const MANUTENCAO_KEY = 'Manutenção'
const CONCLUIDA_KEY  = 'Concluída'
MAP[MANUTENCAO_KEY]  = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
MAP[CONCLUIDA_KEY]   = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'

export default function StatusBadge({ status }) {
  const cls = MAP[status] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status ?? '—'}
    </span>
  )
}
