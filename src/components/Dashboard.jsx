import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Wrench, Droplets, Gauge, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
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
      { data: hist },
    ] = await Promise.all([
      supabase.from('fleet_veiculos').select('*'),
      supabase.from('fleet_controle_oleo').select('*, fleet_veiculos(codigo_vda, placa)'),
      supabase.from('fleet_controle_tacografo').select('*, fleet_veiculos(codigo_vda, placa)'),
      supabase.from('fleet_manutencoes').select('*, fleet_veiculos(codigo_vda, placa)').order('data_os', { ascending: false }),
      supabase.from('fleet_historico_status').select('data,veiculo_id,codigo_vda,categoria,status_operacional,status_dia').order('data', { ascending: false }).limit(3000),
    ])

    // --- Óleo (fleet_controle_oleo usa km_atual e km_ultima_troca) ---
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

    // --- Tacógrafo (fleet_controle_tacografo: calcular vencimento a partir de data_ultima_afericao + validade_dias) ---
    const hoje = new Date()
    const tacoComVenc = (taco || []).map(r => {
      let dataVenc = null
      if (r.data_ultima_afericao && r.validade_dias) {
        const d = new Date(r.data_ultima_afericao)
        d.setDate(d.getDate() + Number(r.validade_dias))
        dataVenc = d
      }
      return { ...r, _dataVenc: dataVenc }
    })
    const tacoAlerts = tacoComVenc.filter(r => {
      if (!r._dataVenc) return false
      const diff = Math.floor((r._dataVenc - hoje) / 86400000)
      return diff < 30
    })
    const tacoVencido = tacoAlerts.filter(r => r._dataVenc < hoje)
    const tacoProximo = tacoAlerts.filter(r => r._dataVenc >= hoje)

    // --- Manutenções por status (fleet_manutencoes usa status_realizacao) ---
    // Valores reais do banco: 'REALIZADO', 'PENDENTE', 'PRIORIDADE ALTA CURTA DE 1 Á 5 DIAS', null
    const STATUS_CONCLUIDO  = 'REALIZADO'
    const STATUS_PENDENTE   = 'PENDENTE'
    const STATUS_PRIORIDADE = 'PRIORIDADE ALTA CURTA DE 1 Á 5 DIAS'
    const allStatus = [STATUS_PENDENTE, STATUS_PRIORIDADE, STATUS_CONCLUIDO]
    const manPorStatus = allStatus.map(s => ({
      name: s === STATUS_CONCLUIDO ? 'Realizado' : s === STATUS_PENDENTE ? 'Pendente' : 'Prioridade Alta',
      value: (man || []).filter(r => r.status_realizacao === s).length,
    }))

    // Manutenções por mês (últimos 6 meses) — campo data_os
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
      if (!r.data_os) continue
      const key = r.data_os.slice(0, 7)
      mesMap[key] = (mesMap[key] || 0) + 1
    }
    const manPorMes = ultimos6.map(({ key, label }) => ({ mes: label, total: mesMap[key] || 0 }))

    // Custo por tipo — campo valor
    const custoTipo = {}
    for (const r of (man || [])) {
      if (!r.valor || !r.tipo_manutencao) continue
      custoTipo[r.tipo_manutencao] = (custoTipo[r.tipo_manutencao] || 0) + Number(r.valor)
    }
    const manCustoTipo = Object.entries(custoTipo).map(([name, custo]) => ({ name, custo }))

    const manAbertas   = (man || []).filter(r => r.status_realizacao === STATUS_PENDENTE || r.status_realizacao === STATUS_PRIORIDADE).length
    const manAndamento = (man || []).filter(r => r.status_realizacao === STATUS_PRIORIDADE).length

    // --- Histórico da Frota ---
    const histRows = hist || []

    // Últimos 30 dias por semana (agrupado por semana ISO)
    const semanaMap = {}
    for (const r of histRows) {
      const d = new Date(r.data + 'T00:00:00')
      // semana ISO: segunda-feira da semana
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
      const seg = new Date(d); seg.setDate(d.getDate() - dow)
      const wk = seg.toISOString().slice(0, 10)
      if (!semanaMap[wk]) semanaMap[wk] = { ativo: 0, manutencao: 0, inapto: 0, semStatus: 0 }
      const s = r.status_dia || (r.status_operacional === 'Manutenção' ? 'Inapto' : 'Sem Status')
      if (r.status_operacional === 'Ativo' && (s === 'Apto para a Rota' || s === 'Apto para Serviço' || s === 'Apto com Observação')) semanaMap[wk].ativo++
      else if (r.status_operacional === 'Manutenção' || s === 'Inapto') semanaMap[wk].manutencao++
      else semanaMap[wk].semStatus++
    }
    const histPorSemana = Object.entries(semanaMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([wk, v]) => ({
        semana: new Date(wk + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        Ativo: v.ativo, Manutenção: v.manutencao, 'Sem Status': v.semStatus,
      }))

    // Ranking de disponibilidade por veículo
    const veicMap = {}
    for (const r of histRows) {
      if (!veicMap[r.codigo_vda]) veicMap[r.codigo_vda] = { total: 0, apto: 0, manut: 0 }
      veicMap[r.codigo_vda].total++
      const s = r.status_dia || (r.status_operacional === 'Manutenção' ? 'Inapto' : 'Sem Status')
      if (r.status_operacional === 'Ativo' && (s === 'Apto para a Rota' || s === 'Apto para Serviço' || s === 'Apto com Observação')) veicMap[r.codigo_vda].apto++
      else if (r.status_operacional === 'Manutenção' || s === 'Inapto') veicMap[r.codigo_vda].manut++
    }
    const rankingDisp = Object.entries(veicMap)
      .map(([vda, v]) => ({
        vda,
        total: v.total,
        apto: v.apto,
        manut: v.manut,
        pct: v.total > 0 ? Math.round((v.apto / v.total) * 100) : null,
      }))
      .filter(v => v.total >= 3)
      .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))

    // KPI: disponibilidade geral (% dias apto / total registros)
    const totalReg = histRows.length
    const totalApto = histRows.filter(r => {
      const s = r.status_dia || (r.status_operacional === 'Manutenção' ? 'Inapto' : 'Sem Status')
      return r.status_operacional === 'Ativo' && (s === 'Apto para a Rota' || s === 'Apto para Serviço' || s === 'Apto com Observação')
    }).length
    const dispGeral = totalReg > 0 ? Math.round((totalApto / totalReg) * 100) : null

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
      histPorSemana, rankingDisp, dispGeral, totalHistDias: new Set(histRows.map(r => r.data)).size,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const tables = ['fleet_veiculos', 'fleet_controle_oleo', 'fleet_controle_tacografo', 'fleet_manutencoes']
    const channels = tables.map(table =>
      supabase.channel(`dash-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, load)
        .subscribe()
    )
    return () => channels.forEach(ch => supabase.removeChannel(ch))
  }, [load])

  if (loading || !data) return <div className="text-center py-24 text-gray-500 text-sm">Carregando dashboard…</div>

  const totalAlertas = data.oleoAlerts + data.tacoAlerts

  const CONCLUIDA_STATUS = 'REALIZADO'

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
                msg={`Óleo ULTRAPASSOU limite — ${r.fleet_veiculos?.codigo_vda} (${r.fleet_veiculos?.placa}): ${((r.km_atual||0)-(r.km_ultima_troca||0)).toLocaleString('pt-BR')} km rodados`} />
            ))}
            {data.oleoProximo.map(r => (
              <AlertRow key={r.id} icon={Droplets} color="yellow"
                msg={`Óleo próximo da troca — ${r.fleet_veiculos?.codigo_vda} (${r.fleet_veiculos?.placa}): ${((r.km_atual||0)-(r.km_ultima_troca||0)).toLocaleString('pt-BR')} / ${(r.km_oleo_limite||10000).toLocaleString('pt-BR')} km`} />
            ))}
            {data.tacoVencido.map(r => (
              <AlertRow key={r.id} icon={Gauge} color="red"
                msg={`Tacógrafo VENCIDO — ${r.fleet_veiculos?.codigo_vda} (${r.fleet_veiculos?.placa}): venceu em ${r._dataVenc?.toLocaleDateString('pt-BR')}`} />
            ))}
            {data.tacoProximo.map(r => {
              const dias = Math.floor((r._dataVenc - new Date()) / 86400000)
              return (
                <AlertRow key={r.id} icon={Gauge} color="yellow"
                  msg={`Tacógrafo vence em ${dias} dia${dias !== 1 ? 's' : ''} — ${r.fleet_veiculos?.codigo_vda} (${r.fleet_veiculos?.placa})`} />
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
            <SectionTitle>Custo Total por Tipo de Manutenção (R$)</SectionTitle>
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
                    <td className="px-4 py-3 font-medium text-white">{r.fleet_veiculos?.codigo_vda ?? r.codigo_vda ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.data_os ? r.data_os.slice(0,10).split('-').reverse().join('/') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{r.tipo_manutencao ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{r.descricao_servico ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        r.status_realizacao === CONCLUIDA_STATUS ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : r.status_realizacao === 'PENDENTE'                             ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : r.status_realizacao === 'PRIORIDADE ALTA CURTA DE 1 Á 5 DIAS' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                        : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                      }`}>{r.status_realizacao ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico da Frota */}
      {data.totalHistDias > 0 && (
        <div className="space-y-4">
          <SectionTitle>Histórico da Frota</SectionTitle>

          {/* KPI disponibilidade */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <Activity size={20} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {data.dispGeral !== null ? `${data.dispGeral}%` : '—'}
                </p>
                <p className="text-xs text-gray-400">Disponibilidade Geral</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <Truck size={20} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-blue-400">{data.totalHistDias}</p>
                <p className="text-xs text-gray-400">Dias com Registro</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3 sm:col-span-1 col-span-2">
              <Wrench size={20} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-yellow-400">
                  {data.dispGeral !== null ? `${100 - data.dispGeral}%` : '—'}
                </p>
                <p className="text-xs text-gray-400">Em Manutenção / Inapto</p>
              </div>
            </div>
          </div>

          {/* Gráfico por semana */}
          {data.histPorSemana.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <SectionTitle>Ativo vs Manutenção — Por Semana</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.histPorSemana} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="semana" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                  <Bar dataKey="Ativo" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                  <Bar dataKey="Manutenção" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                  <Bar dataKey="Sem Status" stackId="a" fill="#4b5563" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranking por veículo */}
          {data.rankingDisp.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Disponibilidade por Veículo</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Veículo', 'Dias Apto', 'Dias Manut.', 'Total Dias', '% Disponível'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rankingDisp.map(r => (
                    <tr key={r.vda} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-semibold text-white">{r.vda}</td>
                      <td className="px-4 py-3 text-emerald-400">{r.apto}</td>
                      <td className="px-4 py-3 text-yellow-400">{r.manut}</td>
                      <td className="px-4 py-3 text-gray-400">{r.total}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-800 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${r.pct ?? 0}%`,
                                background: r.pct >= 80 ? '#10b981' : r.pct >= 60 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${r.pct >= 80 ? 'text-emerald-400' : r.pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {r.pct !== null ? `${r.pct}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
