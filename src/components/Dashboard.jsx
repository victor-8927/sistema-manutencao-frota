import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Wrench, Droplets, Gauge, AlertTriangle, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import KPICard from './KPICard'

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#10b981']

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{children}</h2>
}

function AlertRow({ icon: Icon, msg, color }) {
  const ring = { red: 'border-red-500/30 bg-red-500/5', yellow: 'border-yellow-500/30 bg-yellow-500/5' }[color]
  const tc   = { red: 'text-red-400', yellow: 'text-yellow-400' }[color]
  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 ${ring}`}>
      <Icon size={16} className={`${tc} shrink-0 mt-0.5`} />
      <p className="text-sm text-gray-300">{msg}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: veiculos },
      { data: oleo },
      { data: taco },
      { data: man },
    ] = await Promise.all([
      supabase.from('veiculos').select('*'),
      supabase.from('controle_oleo').select('*, veiculos(codigo_vda, placa)'),
      supabase.from('controle_tacografo').select('*, veiculos(codigo_vda, placa)'),
      supabase.from('manutencoes').select('*, veiculos(codigo_vda, placa)').order('data_abertura', { ascending: false }),
    ])

    // --- Óleo ---
    const oleoAlerts = (oleo || []).filter(r => {
      const rod = (r.km_atual || 0) - (r.km_ultima_troca || 0)
      return rod >= (r.km_oleo_limite || 10000) * 0.9
    })
    const oleoVencido = oleoAlerts.filter(r => {
      const rod = (r.km_atual || 0) - (r.km_ultima_troca || 0)
      return rod >= (r.km_oleo_limite || 10000)
    })
    const oleoProximo = oleoAlerts.filter(r => {
      const rod = (r.km_atual || 0) - (r.km_ultima_troca || 0)
      const lim = r.km_oleo_limite || 10000
      return rod >= lim * 0.9 && rod < lim
    })

    // --- Tacógrafo ---
    const hoje = new Date()
    const tacoAlerts = (taco || []).filter(r => {
      if (!r.data_vencimento) return false
      const diff = Math.floor((new Date(r.data_vencimento) - hoje) / 86400000)
      return diff < 30
    })
    const tacoVencido = tacoAlerts.filter(r => new Date(r.data_vencimento) < hoje)
    const tacoProximo = tacoAlerts.filter(r => new Date(r.data_vencimento) >= hoje)

    // --- Manutenções por status ---
    const statusList = ['Aberta', 'Em Andamento', 'Cancelada']
    const CONCLUIDA = 'Concluída'
    const allStatus = [...statusList, CONCLUIDA]
    const manPorStatus = allStatus.map(s => ({
      name: s,
      value: (man || []).filter(r => r.status === s).length,
    }))

    // Manutenções por mês (últimos 6 meses)
    const mesMap = {}
    const ultimos6 = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('pt-BR', { month: 'short' }),
      }
    })
    for (const r of (man || [])) {
      if (!r.data_abertura) continue
      const key = r.data_abertura.slice(0, 7)
      mesMap[key] = (mesMap[key] || 0) + 1
    }
    const manPorMes = ultimos6.map(({ key, label }) => ({ mes: label, total: mesMap[key] || 0 }))

    // Custo por tipo
    const custoTipo = {}
    for (const r of (man || [])) {
      if (!r.custo_total || !r.tipo_manutencao) continue
      custoTipo[r.tipo_manutencao] = (custoTipo[r.tipo_manutencao] || 0) + Number(r.custo_total)
    }
    const manCustoTipo = Object.entries(custoTipo).map(([name, custo]) => ({ name, custo }))

    const manAbertas   = (man || []).filter(r => r.status === 'Aberta').length
    const manAndamento = (man || []).filter(r => r.status === 'Em Andamento').length

    setData({
      totalVeiculos: (veiculos || []).length,
      veiculosAtivos: (veiculos || []).filter(v => v.status_operacional === 'Ativo').length,
      oleoAlerts: oleoAlerts.length,
      tacoAlerts: tacoAlerts.length,
      manAbertas,
      manAndamento,
      oleoVencido, oleoProximo, tacoVencido, tacoProximo,
      manPorStatus, manPorMes, manCustoTipo,
      recentesMantencoes: (man || []).slice(0, 5),
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channels = ['veiculos', 'controle_oleo', 'controle_tacografo', 'manutencoes'].map(table =>
      supabase.channel(`dash-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, load)
        .subscribe()
    )
    return () => channels.forEach(ch => supabase.removeChannel(ch))
  }, [load])

  if (loading || !data) return <div className="text-center py-24 text-gray-500 text-sm">Carregando dashboard…</div>

  const totalAlertas = data.oleoAlerts + data.tacoAlerts

  const CONCLUIDA_STATUS = 'Concluída'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard title="Total Frota"    value={data.totalVeiculos} icon={Truck}   color="blue"   subtitle={`${data.veiculosAtivos} ativos`} />
        <KPICard title="Alertas Ativos" value={totalAlertas}        icon={AlertTriangle} color={totalAlertas > 0 ? 'red' : 'green'} subtitle="óleo + tacógrafo" />
        <KPICard title="OS Abertas"     value={data.manAbertas}     icon={Wrench}  color="yellow" subtitle={`${data.manAndamento} em andamento`} />
        <KPICard title="Alerta Óleo"    value={data.oleoAlerts}     icon={Droplets} color={data.oleoAlerts > 0 ? 'red' : 'green'} subtitle="próximos ou vencidos" />
      </div>

      {/* Alertas */}
      {(data.oleoVencido.length > 0 || data.oleoProximo.length > 0 || data.tacoVencido.length > 0 || data.tacoProximo.length > 0) && (
        <div>
          <SectionTitle>Alertas</SectionTitle>
          <div className="space-y-2">
            {data.oleoVencido.map(r => (
              <AlertRow key={r.id} icon={Droplets} color="red"
                msg={`Óleo ULTRAPASSOU limite — ${r.veiculos?.codigo_vda} (${r.veiculos?.placa}): ${((r.km_atual||0)-(r.km_ultima_troca||0)).toLocaleString('pt-BR')} km rodados`} />
            ))}
            {data.oleoProximo.map(r => (
              <AlertRow key={r.id} icon={Droplets} color="yellow"
                msg={`Óleo próximo da troca — ${r.veiculos?.codigo_vda} (${r.veiculos?.placa}): ${((r.km_atual||0)-(r.km_ultima_troca||0)).toLocaleString('pt-BR')} / ${(r.km_oleo_limite||10000).toLocaleString('pt-BR')} km`} />
            ))}
            {data.tacoVencido.map(r => (
              <AlertRow key={r.id} icon={Gauge} color="red"
                msg={`Tacógrafo VENCIDO — ${r.veiculos?.codigo_vda} (${r.veiculos?.placa}): venceu em ${r.data_vencimento?.slice(0,10).split('-').reverse().join('/')}`} />
            ))}
            {data.tacoProximo.map(r => {
              const dias = Math.floor((new Date(r.data_vencimento) - new Date()) / 86400000)
              return (
                <AlertRow key={r.id} icon={Gauge} color="yellow"
                  msg={`Tacógrafo vence em ${dias} dia${dias !== 1 ? 's' : ''} — ${r.veiculos?.codigo_vda} (${r.veiculos?.placa})`} />
              )
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionTitle>Manutenções por Mês</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.manPorMes} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }} />
              <Bar dataKey="total" name="OS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SectionTitle>Status das Manutenções</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.manPorStatus.filter(d => d.value > 0)} cx="50%" cy="50%"
                innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                {data.manPorStatus.filter(d => d.value > 0).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {data.manCustoTipo.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 lg:col-span-2">
            <SectionTitle>Custo Total por Tipo de Manutencao (R$)</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.manCustoTipo} margin={{ top: 0, right: 0, left: 10, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }}
                  formatter={v => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']} />
                <Bar dataKey="custo" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data.recentesMantencoes.length > 0 && (
        <div>
          <SectionTitle>Últimas Manutenções</SectionTitle>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Veículo','Data','Tipo','Descrição','Status'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentesMantencoes.map(r => (
                  <tr key={r.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-medium text-white">{r.veiculos?.codigo_vda ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.data_abertura ? r.data_abertura.slice(0,10).split('-').reverse().join('/') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{r.tipo_manutencao}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{r.descricao}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        r.status === CONCLUIDA_STATUS ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : r.status === 'Aberta'       ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : r.status === 'Em Andamento' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                        : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw size={12} /> Atualizar dashboard
        </button>
      </div>
    </div>
  )
}
