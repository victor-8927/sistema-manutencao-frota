import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Gauge, RefreshCw, Edit2, Trash2, Save, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import StatusBadge from './StatusBadge'

function calcStatus(r) {
  if (!r.data_vencimento) return { label: 'Sem Data', color: 'gray', diasRestantes: null }
  const hoje = new Date()
  const venc = new Date(r.data_vencimento)
  const diff = Math.floor((venc - hoje) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: 'Vencido',          color: 'red',    diasRestantes: diff }
  if (diff < 30) return { label: 'Pronto p/ Aferir', color: 'yellow', diasRestantes: diff }
  return              { label: 'Normal',              color: 'green',  diasRestantes: diff }
}

function fmtDate(v) {
  if (!v) return '—'
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

function addDays(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function TacoModal({ row, veiculos, onClose, onSaved }) {
  const isNew = !row?.id
  const [form, setForm] = useState({
    veiculo_id:           row?.veiculo_id           ?? '',
    data_realizacao:      row?.data_realizacao      ?? new Date().toISOString().split('T')[0],
    data_ultima_afericao: row?.data_ultima_afericao ?? new Date().toISOString().split('T')[0],
    validade_dias:        row?.validade_dias        ?? 365,
    data_vencimento:      row?.data_vencimento      ?? addDays(new Date().toISOString().split('T')[0], 365),
    notas:                row?.notas                ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'data_ultima_afericao' || k === 'validade_dias') {
        next.data_vencimento = addDays(next.data_ultima_afericao, Number(next.validade_dias) || 0)
      }
      return next
    })
  }

  async function save() {
    if (!form.veiculo_id) { setErr('Selecione um veículo'); return }
    setSaving(true); setErr('')
    const payload = {
      veiculo_id:           form.veiculo_id,
      data_realizacao:      form.data_realizacao      || null,
      data_ultima_afericao: form.data_ultima_afericao || null,
      validade_dias:        Number(form.validade_dias),
      data_vencimento:      form.data_vencimento      || null,
      notas:                form.notas                || null,
    }
    const { error } = await (isNew
      ? supabase.from('controle_tacografo').insert(payload)
      : supabase.from('controle_tacografo').update(payload).eq('id', row.id))
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={isNew ? 'Novo Registro de Tacógrafo' : 'Editar Tacógrafo'} onClose={onClose}>
      <div className="space-y-4">
        {err && <p className="text-red-400 text-sm">{err}</p>}
        {isNew && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Veículo *</label>
            <select value={form.veiculo_id} onChange={e => set('veiculo_id', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Selecione…</option>
              {veiculos.map(v => <option key={v.id} value={v.id}>{v.codigo_vda} — {v.placa}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data Realização</label>
            <input type="date" value={form.data_realizacao} onChange={e => set('data_realizacao', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Data Última Aferição</label>
            <input type="date" value={form.data_ultima_afericao} onChange={e => set('data_ultima_afericao', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Validade (dias)</label>
            <input type="number" value={form.validade_dias} onChange={e => set('validade_dias', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Vencimento (auto-calc.)</label>
            <input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notas</label>
          <textarea rows={3} value={form.notas} onChange={e => set('notas', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
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

export default function Tacografo() {
  const [rows, setRows]         = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalRow, setModalRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [search, setSearch]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: tc }, { data: vei }] = await Promise.all([
      supabase.from('controle_tacografo').select('*, veiculos(id, codigo_vda, placa)').order('data_vencimento', { ascending: true }),
      supabase.from('veiculos').select('id, codigo_vda, placa').order('codigo_vda'),
    ])
    setRows(tc || []); setVeiculos(vei || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('taco-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'controle_tacografo' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  async function handleDelete() {
    await supabase.from('controle_tacografo').delete().eq('id', deleteRow.id)
    setDeleteRow(null); load()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return !q || r.veiculos?.codigo_vda?.toLowerCase().includes(q) || r.veiculos?.placa?.toLowerCase().includes(q)
  })

  const semRegistro = veiculos.filter(v => !rows.find(r => r.veiculo_id === v.id))

  if (loading) return <div className="text-center py-24 text-gray-500 text-sm">Carregando tacógrafos…</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <input type="text" placeholder="Buscar veículo…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          {semRegistro.length > 0 && (
            <button onClick={() => setModalRow(false)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              <Gauge size={14} /> Novo Registro
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Vencido',          color: 'red',    icon: AlertTriangle },
          { label: 'Pronto p/ Aferir', color: 'yellow', icon: Clock },
          { label: 'Normal',           color: 'green',  icon: CheckCircle },
        ].map(({ label, color, icon: Icon }) => {
          const cnt = rows.filter(r => calcStatus(r).label === label).length
          const bg  = { red: 'bg-red-500/10 border-red-500/30', yellow: 'bg-yellow-500/10 border-yellow-500/30', green: 'bg-emerald-500/10 border-emerald-500/30' }[color]
          const tc  = { red: 'text-red-400', yellow: 'text-yellow-400', green: 'text-emerald-400' }[color]
          return (
            <div key={label} className={`${bg} border rounded-xl p-4 flex items-center gap-3`}>
              <Icon size={20} className={tc} />
              <div><p className={`text-xl font-bold ${tc}`}>{cnt}</p><p className="text-xs text-gray-400">{label}</p></div>
            </div>
          )
        })}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Veículo','Placa','Data Realização','Última Aferição','Validade','Vencimento','Dias Restantes','Status','Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-500 py-10">Nenhum registro encontrado</td></tr>
              )}
              {filtered.map(r => {
                const st = calcStatus(r)
                const diasCls = st.diasRestantes === null ? 'text-gray-500'
                  : st.diasRestantes < 0  ? 'text-red-400 font-medium'
                  : st.diasRestantes < 30 ? 'text-yellow-400 font-medium'
                  : 'text-gray-300'
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.veiculos?.codigo_vda ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{r.veiculos?.placa ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{fmtDate(r.data_realizacao)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmtDate(r.data_ultima_afericao)}</td>
                    <td className="px-4 py-3 text-gray-400">{r.validade_dias ?? '—'} dias</td>
                    <td className="px-4 py-3 text-gray-300">{fmtDate(r.data_vencimento)}</td>
                    <td className={`px-4 py-3 ${diasCls}`}>
                      {st.diasRestantes === null ? '—'
                        : st.diasRestantes < 0 ? `${Math.abs(st.diasRestantes)}d vencido`
                        : `${st.diasRestantes}d`}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={st.label} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setModalRow(r)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteRow(r)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalRow !== null && (
        <TacoModal row={modalRow || null} veiculos={modalRow ? veiculos : semRegistro}
          onClose={() => setModalRow(null)} onSaved={() => { setModalRow(null); load() }} />
      )}
      {deleteRow && (
        <ConfirmDialog message={`Excluir registro de tacógrafo do veículo ${deleteRow.veiculos?.codigo_vda ?? ''}?`}
          onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />
      )}
    </div>
  )
}
