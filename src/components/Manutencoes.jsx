import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Wrench, Plus, RefreshCw, Edit2, Trash2, Save, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import StatusBadge from './StatusBadge'
import KPICard from './KPICard'

const PAGE_SIZE = 50
const TABLE = 'fleet_manutencoes'

const TIPO_MANUT_OPTS   = ['CORRETIVA', 'PREVENTIVA', 'OUTROS']
const TIPO_DESPESA_OPTS = ['PEÇAS', 'SERVIÇOS', 'DESP. OBRIG', 'MAT DE CONS', 'OUTROS']
const STATUS_VEIC_OPTS  = ['RODANDO', 'PARADO', 'OUTROS']
const STATUS_REAL_OPTS  = ['REALIZADO', 'PENDENTE', 'CANCELADO']
const LOCAL_OPTS        = ['INTERNO', 'EXTERNO']
const PRIOR_OPTS        = [
  'PRIORIDADE ALTA',
  'PRIORIDADE ALTA CURTA DE 1 Á 5 DIAS',
  'PRIORIDADE ALTA CURTA DE 6 Á 30 DIAS',
  'PRIORIDADE MÉDIA',
  'PRIORIDADE LEVE',
]

const PERIODO_MODOS = [
  { v: 'mes',   l: 'Mês / Ano'   },
  { v: 'ano',   l: 'Ano inteiro' },
  { v: 'dia',   l: 'Dia exato'   },
  { v: 'range', l: 'Intervalo'   },
]

const currentYear = new Date().getFullYear()
const ANOS = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i)
const MESES = [
  { v: '01', l: 'Jan' }, { v: '02', l: 'Fev' }, { v: '03', l: 'Mar' },
  { v: '04', l: 'Abr' }, { v: '05', l: 'Mai' }, { v: '06', l: 'Jun' },
  { v: '07', l: 'Jul' }, { v: '08', l: 'Ago' }, { v: '09', l: 'Set' },
  { v: '10', l: 'Out' }, { v: '11', l: 'Nov' }, { v: '12', l: 'Dez' },
]
const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmtCurrency(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(v) {
  if (!v) return '—'
  const s = v.slice ? v.slice(0, 10) : String(v)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const EMPTY_FORM = {
  veiculo_id:               '',
  data_os:                  '',
  solicitante_os:           '',
  tipo_manutencao:          '',
  tipo_despesa:             '',
  status_veiculo:           '',
  ordem_compra:             '',
  descricao_servico:        '',
  quantidade:               '',
  fornecedor:               '',
  nota_fiscal:              '',
  valor:                    '',
  observacoes:              '',
  local_servico:            '',
  quilometragem:            '',
  tempo_hora_servico:       '',
  data_encerramento_os:     '',
  classificacao_prioridade: '',
  status_realizacao:        '',
  numero_os:                '',
  pg_cleber:                '',
}

function fromRow(row) {
  if (!row) return { ...EMPTY_FORM }
  return {
    veiculo_id:               row.veiculo_id               ?? '',
    data_os:                  row.data_os                  ?? '',
    solicitante_os:           row.solicitante_os           ?? '',
    tipo_manutencao:          row.tipo_manutencao          ?? '',
    tipo_despesa:             row.tipo_despesa             ?? '',
    status_veiculo:           row.status_veiculo           ?? '',
    ordem_compra:             row.ordem_compra             ?? '',
    descricao_servico:        row.descricao_servico        ?? '',
    quantidade:               row.quantidade               ?? '',
    fornecedor:               row.fornecedor               ?? '',
    nota_fiscal:              row.nota_fiscal              ?? '',
    valor:                    row.valor                    ?? '',
    observacoes:              row.observacoes              ?? '',
    local_servico:            row.local_servico            ?? '',
    quilometragem:            row.quilometragem            ?? '',
    tempo_hora_servico:       row.tempo_hora_servico       ?? '',
    data_encerramento_os:     row.data_encerramento_os     ?? '',
    classificacao_prioridade: row.classificacao_prioridade ?? '',
    status_realizacao:        row.status_realizacao        ?? '',
    numero_os:                row.numero_os                ?? '',
    pg_cleber:                row.pg_cleber                ?? '',
  }
}

function ManutencaoModal({ row, veiculos, onClose, onSaved }) {
  const isNew = !row?.id
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(() => {
    const f = fromRow(row)
    if (isNew && !f.data_os) f.data_os = today
    return f
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.veiculo_id)            { setErr('Selecione um veículo'); return }
    if (!form.descricao_servico.trim()) { setErr('Descrição é obrigatória'); return }
    setSaving(true); setErr('')

    const payload = {
      veiculo_id:               form.veiculo_id,
      data_os:                  form.data_os                  || null,
      solicitante_os:           form.solicitante_os           || null,
      tipo_manutencao:          form.tipo_manutencao          || null,
      tipo_despesa:             form.tipo_despesa             || null,
      status_veiculo:           form.status_veiculo           || null,
      codigo_vda:               veiculos.find(v => v.id === form.veiculo_id)?.codigo_vda ?? null,
      ordem_compra:             form.ordem_compra             || null,
      descricao_servico:        form.descricao_servico.trim(),
      quantidade:               form.quantidade !== '' ? Number(form.quantidade)               : null,
      fornecedor:               form.fornecedor               || null,
      nota_fiscal:              form.nota_fiscal              || null,
      valor:                    form.valor          !== '' ? Number(form.valor)                : null,
      observacoes:              form.observacoes              || null,
      local_servico:            form.local_servico            || null,
      quilometragem:            form.quilometragem  !== '' ? Number(form.quilometragem)        : null,
      tempo_hora_servico:       form.tempo_hora_servico !== '' ? Number(form.tempo_hora_servico) : null,
      data_encerramento_os:     form.data_encerramento_os     || null,
      classificacao_prioridade: form.classificacao_prioridade || null,
      status_realizacao:        form.status_realizacao        || null,
      numero_os:                form.numero_os                || null,
      pg_cleber:                form.pg_cleber                || null,
    }

    const { error } = await (isNew
      ? supabase.from(TABLE).insert(payload)
      : supabase.from(TABLE).update(payload).eq('id', row.id))
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  const ic = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500'
  const lc = 'block text-xs text-gray-400 mb-1'
  const Select = ({ field, opts, placeholder }) => (
    <select value={form[field]} onChange={e => set(field, e.target.value)} className={ic}>
      <option value="">{placeholder ?? 'Selecione…'}</option>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <Modal title={isNew ? 'Nova Manutenção' : 'Editar Manutenção'} onClose={onClose} wide>
      <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="grid grid-cols-2 gap-3">

          {/* Veículo */}
          <div className="col-span-2">
            <label className={lc}>Veículo *</label>
            <select value={form.veiculo_id} onChange={e => set('veiculo_id', e.target.value)} className={ic}>
              <option value="">Selecione…</option>
              {veiculos.map(v => <option key={v.id} value={v.id}>{v.codigo_vda} — {v.placa}</option>)}
            </select>
          </div>

          {/* Linha: Tipo manutenção / Tipo despesa */}
          <div>
            <label className={lc}>Tipo Manutenção</label>
            <Select field="tipo_manutencao" opts={TIPO_MANUT_OPTS} />
          </div>
          <div>
            <label className={lc}>Tipo Despesa</label>
            <Select field="tipo_despesa" opts={TIPO_DESPESA_OPTS} />
          </div>

          {/* Linha: Status veículo / Status realização */}
          <div>
            <label className={lc}>Status Veículo</label>
            <Select field="status_veiculo" opts={STATUS_VEIC_OPTS} />
          </div>
          <div>
            <label className={lc}>Status Realização</label>
            <Select field="status_realizacao" opts={STATUS_REAL_OPTS} />
          </div>

          {/* Linha: Solicitante / Número OS */}
          <div>
            <label className={lc}>Solicitante OS</label>
            <input type="text" value={form.solicitante_os} onChange={e => set('solicitante_os', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Número OS</label>
            <input type="text" value={form.numero_os} onChange={e => set('numero_os', e.target.value)} className={ic} />
          </div>

          {/* Linha: Data OS / Data Encerramento */}
          <div>
            <label className={lc}>Data OS (Abertura)</label>
            <input type="date" value={form.data_os} onChange={e => set('data_os', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Data Encerramento</label>
            <input type="date" value={form.data_encerramento_os} onChange={e => set('data_encerramento_os', e.target.value)} className={ic} />
          </div>

          {/* Linha: Ordem Compra / Nota Fiscal */}
          <div>
            <label className={lc}>Ordem de Compra / Serviço</label>
            <input type="text" value={form.ordem_compra} onChange={e => set('ordem_compra', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Nota Fiscal</label>
            <input type="text" value={form.nota_fiscal} onChange={e => set('nota_fiscal', e.target.value)} className={ic} />
          </div>

          {/* Descrição */}
          <div className="col-span-2">
            <label className={lc}>Descrição do Serviço / Item *</label>
            <textarea rows={3} value={form.descricao_servico} onChange={e => set('descricao_servico', e.target.value)} className={`${ic} resize-none`} />
          </div>

          {/* Linha: Quantidade / Fornecedor */}
          <div>
            <label className={lc}>Quantidade</label>
            <input type="number" step="1" min="0" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Fornecedor</label>
            <input type="text" value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)} className={ic} />
          </div>

          {/* Linha: Valor / Local Serviço */}
          <div>
            <label className={lc}>Valor (R$)</label>
            <input type="number" step="0.01" min="0" value={form.valor} onChange={e => set('valor', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Local do Serviço</label>
            <Select field="local_servico" opts={LOCAL_OPTS} />
          </div>

          {/* Linha: KM / Tempo hora */}
          <div>
            <label className={lc}>Quilometragem</label>
            <input type="number" step="1" min="0" value={form.quilometragem} onChange={e => set('quilometragem', e.target.value)} className={ic} />
          </div>
          <div>
            <label className={lc}>Tempo Hora de Serviço</label>
            <input type="number" step="0.5" min="0" value={form.tempo_hora_servico} onChange={e => set('tempo_hora_servico', e.target.value)} className={ic} />
          </div>

          {/* Linha: Prioridade / PG Cleber */}
          <div>
            <label className={lc}>Classificação de Prioridade</label>
            <Select field="classificacao_prioridade" opts={PRIOR_OPTS} />
          </div>
          <div>
            <label className={lc}>PG Cleber</label>
            <input type="text" value={form.pg_cleber} onChange={e => set('pg_cleber', e.target.value)} className={ic} placeholder="OK / —" />
          </div>

          {/* Observações */}
          <div className="col-span-2">
            <label className={lc}>Observações Gerais</label>
            <textarea rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} className={`${ic} resize-none`} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            <Save size={14} />{saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Manutencoes() {
  const now = new Date()
  const todayISO = now.toISOString().split('T')[0]

  const [rows, setRows]               = useState([])
  const [veiculos, setVeiculos]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modalRow, setModalRow]       = useState(null)
  const [deleteRow, setDeleteRow]     = useState(null)
  const [search, setSearch]           = useState('')
  const [filterTipo, setFilterTipo]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage]               = useState(0)

  // Filtros de período (server-side)
  const [periodoModo, setPeriodoModo] = useState('mes')
  const [filterAno,  setFilterAno]    = useState(String(now.getFullYear()))
  const [filterMes,  setFilterMes]    = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [filterDia,  setFilterDia]    = useState(todayISO)
  const [rangeStart, setRangeStart]   = useState('')
  const [rangeEnd,   setRangeEnd]     = useState('')

  function getPeriodoBounds() {
    if (periodoModo === 'mes' && filterAno && filterMes) {
      const lastDay = new Date(parseInt(filterAno), parseInt(filterMes), 0).getDate()
      return { start: `${filterAno}-${filterMes.padStart(2,'0')}-01`, end: `${filterAno}-${filterMes.padStart(2,'0')}-${lastDay}` }
    }
    if (periodoModo === 'ano' && filterAno) {
      return { start: `${filterAno}-01-01`, end: `${filterAno}-12-31` }
    }
    if (periodoModo === 'dia' && filterDia) {
      return { start: filterDia, end: filterDia }
    }
    if (periodoModo === 'range' && rangeStart && rangeEnd) {
      return { start: rangeStart, end: rangeEnd }
    }
    return null
  }

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from(TABLE)
      .select('*, fleet_veiculos(id, codigo_vda, placa)')
      .order('data_os', { ascending: false })

    const bounds = getPeriodoBounds()
    if (bounds) {
      query = query.gte('data_os', bounds.start).lte('data_os', bounds.end)
    }

    const [{ data: man }, { data: vei }] = await Promise.all([
      query,
      supabase.from('fleet_veiculos').select('id, codigo_vda, placa').order('codigo_vda'),
    ])
    setRows(man || [])
    setVeiculos(vei || [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoModo, filterAno, filterMes, filterDia, rangeStart, rangeEnd])

  useEffect(() => {
    load()
    const ch = supabase.channel('fleet-man-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => { setPage(0) }, [search, filterTipo, filterStatus, periodoModo, filterAno, filterMes, filterDia, rangeStart, rangeEnd])

  async function handleDelete() {
    await supabase.from(TABLE).delete().eq('id', deleteRow.id)
    setDeleteRow(null); load()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const veiculo = r.fleet_veiculos
    const matchQ = !q
      || veiculo?.codigo_vda?.toLowerCase().includes(q)
      || veiculo?.placa?.toLowerCase().includes(q)
      || r.descricao_servico?.toLowerCase().includes(q)
      || r.numero_os?.toLowerCase().includes(q)
      || r.fornecedor?.toLowerCase().includes(q)
      || r.solicitante_os?.toLowerCase().includes(q)
      || r.ordem_compra?.toLowerCase().includes(q)
    const matchT = !filterTipo   || r.tipo_manutencao  === filterTipo
    const matchS = !filterStatus || r.status_realizacao === filterStatus
    return matchQ && matchT && matchS
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // KPIs — calculados sobre o período carregado (server-side)
  const totalValor  = rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
  const realizados  = rows.filter(r => r.status_realizacao === 'REALIZADO').length
  const pendentes   = rows.filter(r => r.status_realizacao === 'PENDENTE').length
  const parados     = rows.filter(r => r.status_veiculo    === 'PARADO').length

  // Label do período para exibir nos KPIs
  function getPeriodoLabel() {
    if (periodoModo === 'mes' && filterAno && filterMes)
      return `${MESES_FULL[parseInt(filterMes, 10) - 1]}/${filterAno}`
    if (periodoModo === 'ano' && filterAno) return filterAno
    if (periodoModo === 'dia' && filterDia) return fmtDate(filterDia)
    if (periodoModo === 'range' && rangeStart && rangeEnd)
      return `${fmtDate(rangeStart)} → ${fmtDate(rangeEnd)}`
    return 'Todos os períodos'
  }
  const periodoLabel = getPeriodoLabel()
  const sel = 'bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white'
  const inp = 'bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white'

  if (loading) return <div className="text-center py-24 text-gray-500 text-sm">Carregando manutenções…</div>

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard title="Total OS"      value={rows.length}             icon={Wrench} color="blue"   subtitle={periodoLabel} />
        <KPICard title="Realizados"    value={realizados}              icon={Wrench} color="green"  subtitle={`${pendentes} pendentes`} />
        <KPICard title="Veíc. Parados" value={parados}                icon={Wrench} color="yellow" subtitle="status parado" />
        <KPICard title="Custo Total"   value={fmtCurrency(totalValor)} icon={Wrench} color="blue"   subtitle={periodoLabel} />
      </div>

      {/* ── Filtros ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-3">

        {/* Linha 1 — Modo de período + controles dinâmicos */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <Calendar size={14} className="text-gray-400 ml-1" />
            {PERIODO_MODOS.map(m => (
              <button key={m.v} onClick={() => { setPeriodoModo(m.v); setPage(0) }}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${periodoModo === m.v ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m.l}
              </button>
            ))}
          </div>

          {periodoModo === 'mes' && (
            <>
              <select value={filterAno} onChange={e => { setFilterAno(e.target.value); setPage(0) }} className={sel}>
                <option value="">Ano…</option>
                {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">
                {MESES.map(m => (
                  <button key={m.v} onClick={() => { setFilterMes(m.v); setPage(0) }}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${filterMes === m.v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {m.l}
                  </button>
                ))}
              </div>
            </>
          )}

          {periodoModo === 'ano' && (
            <select value={filterAno} onChange={e => { setFilterAno(e.target.value); setPage(0) }} className={sel}>
              <option value="">Todos os anos</option>
              {ANOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
            </select>
          )}

          {periodoModo === 'dia' && (
            <input type="date" value={filterDia}
              onChange={e => { setFilterDia(e.target.value); setPage(0) }}
              className={inp} />
          )}

          {periodoModo === 'range' && (
            <>
              <input type="date" value={rangeStart}
                onChange={e => { setRangeStart(e.target.value); setPage(0) }}
                className={inp} />
              <span className="text-gray-500 text-sm">→</span>
              <input type="date" value={rangeEnd}
                onChange={e => { setRangeEnd(e.target.value); setPage(0) }}
                className={inp} />
            </>
          )}

          <span className="text-xs px-2 py-1 bg-blue-500/15 text-blue-400 rounded-full font-medium whitespace-nowrap">
            {periodoLabel}
          </span>
        </div>

        {/* Linha 2 — Tipo, Status, Busca, Ações */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className={sel}>
            <option value="">Todos os tipos</option>
            {TIPO_MANUT_OPTS.map(t => <option key={t}>{t}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={sel}>
            <option value="">Todos os status</option>
            {STATUS_REAL_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
            <input type="text" placeholder="Buscar veículo, descrição, OS, fornecedor…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={load} title="Recarregar"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setModalRow(false)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus size={14} /> Nova OS
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['OS','Veículo','Data OS','Tipo','Tipo Despesa','Descrição','Fornecedor','Valor','St. Veíc.','Realização','Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={11} className="text-center text-gray-500 py-10">Nenhuma manutenção encontrada</td></tr>
              )}
              {paged.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.numero_os || '—'}</td>
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{r.fleet_veiculos?.codigo_vda ?? r.codigo_vda ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(r.data_os)}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.tipo_manutencao || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.tipo_despesa || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{r.descricao_servico}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.fornecedor || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtCurrency(r.valor)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status_veiculo === 'PARADO' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {r.status_veiculo || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status_realizacao} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModalRow(r)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteRow(r)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">
              {filtered.length} de {rows.length} registros ({periodoLabel}) · página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalRow !== null && (
        <ManutencaoModal row={modalRow || null} veiculos={veiculos}
          onClose={() => setModalRow(null)} onSaved={() => { setModalRow(null); load() }} />
      )}
      {deleteRow && (
        <ConfirmDialog
          message={`Excluir OS ${deleteRow.numero_os || ''} do veículo ${deleteRow.fleet_veiculos?.codigo_vda ?? deleteRow.codigo_vda ?? ''}?`}
          onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />
      )}
    </div>
  )
}
