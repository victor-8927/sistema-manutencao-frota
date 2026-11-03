import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Droplets, RefreshCw, Edit2, Trash2, Save, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import StatusBadge from './StatusBadge'

function calcStatus(r) {
  const rod = (r.km_atual || 0) - (r.km_ultima_troca || 0)
  const lim = r.km_oleo_limite || 10000
  if (rod >= lim)       return { label: 'Ultrapassou Limite', color: 'red',    pct: 100 }
  if (rod >= lim * 0.9) return { label: 'Pronto p/ Troca',   color: 'yellow', pct: Math.round((rod/lim)*100) }
  return                       { label: 'Normal',             color: 'green',  pct: Math.round((rod/lim)*100) }
}

function fmtKm(v) { return (v ?? 0).toLocaleString('pt-BR') + ' km' }

function ProgressBar({ pct, color }) {
  const bg = { red: 'bg-red-500', yellow: 'bg-yellow-400', green: 'bg-emerald-500' }[color]
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5">
      <div className={`${bg} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function OleoModal({ row, veiculos, onClose, onSaved }) {
  const isNew = !row?.id
  const [form, setForm] = useState({
    veiculo_id:        row?.veiculo_id        ?? '',
    data_ultima_troca: row?.data_ultima_troca ?? new Date().toISOString().split('T')[0],
    km_ultima_troca:   row?.km_ultima_troca   ?? 0,
    km_atual:          row?.km_atual          ?? 0,
    km_oleo_limite:    row?.km_oleo_limite    ?? 10000,
    notas:             row?.notas             ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.veiculo_id) { setErr('Selecione um veículo'); return }
    setSaving(true); setErr('')
    const payload = {
      veiculo_id:        form.veiculo_id,
      data_ultima_troca: form.data_ultima_troca || null,
      km_ultima_troca:   Number(form.km_ultima_troca),
      km_atual:          Number(form.km_atual),
      km_oleo_limite:    Number(form.km_oleo_limite),
      notas:             form.notas || null,
      data_atualizado:   new Date().toISOString(),
    }
    const { error } = await (isNew
      ? supabase.from('controle_oleo').insert(payload)
      : supabase.from('controle_oleo').update(payload).eq('id', row.id))
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={isNew ? 'Novo Registro de Óleo' : 'Editar Controle de Óleo'} onClose={onClose}>
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
            <label className="block text-xs text-gray-400 mb-1">Data Última Troca</label>
            <input type="date" value={form.data_ultima_troca} onChange={e => set('data_ultima_troca', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">KM Última Troca</label>
            <input type="number" value={form.km_ultima_troca} onChange={e => set('km_ultima_troca', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">KM Atual</label>
            <input type="number" value={form.km_atual} onChange={e => set('km_atual', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Intervalo (km)</label>
            <input type="number" value={form.km_oleo_limite} onChange={e => set('km_oleo_limite', e.target.value)}
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

export default function ControleOleo() {
  const [rows, setRows] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalRow, setModalRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ol }, { data: vei }] = await Promise.all([
      supabase.from('controle_oleo').select('*, veiculos(id, codigo_vda, placa)').order('data_atualizado', { ascending: false }),
      supabase.from('veiculos').select('id, codigo_vda, placa').order('codigo_vda'),
    ])
    setRows(ol || []); setVeiculos(vei || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('oleo-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'controle_oleo' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  async function handleDelete() {
    await supabase.from('controle_oleo').delete().eq('id', deleteRow.id)
    setDeleteRow(null); load()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return !q || r.veiculos?.codigo_vda?.toLowerCase().includes(q) || r.veiculos?.placa?.toLowerCase().includes(q)
  })

  const semRegistro = veiculos.filter(v => !rows.find(r => r.veiculo_id === v.id))

  if (loading) return <div className="text-center py-24 text-gray-500 text-sm">Carregando controle de óleo…</div>

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
              <Droplets size={14} /> Novo Registro
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Ultrapassou Limite', color: 'red',    icon: AlertTriangle },
          { label: 'Pronto p/ Troca',   color: 'yellow', icon: Clock },
          { label: 'Normal',             color: 'green',  icon: CheckCircle },
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
                {['Veículo','Placa','KM Atual','KM Ult. Troca','Rodado','Saldo','Status','Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-gray-500 py-10">Nenhum registro encontrado</td></tr>
              )}
              {filtered.map(r => {
                const st   = calcStatus(r)
                const rod  = (r.km_atual || 0) - (r.km_ultima_troca || 0)
                const saldo = (r.km_oleo_limite || 10000) - rod
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.veiculos?.codigo_vda ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{r.veiculos?.placa ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{fmtKm(r.km_atual)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmtKm(r.km_ultima_troca)}</td>
                    <td className="px-4 py-3 text-gray-300">{fmtKm(rod)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`text-xs font-medium ${saldo < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                          {saldo < 0 ? `+${fmtKm(Math.abs(saldo))}` : fmtKm(saldo)}
                        </span>
                        <ProgressBar pct={st.pct} color={st.color} />
                      </div>
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
        <OleoModal row={modalRow || null} veiculos={modalRow ? veiculos : semRegistro}
          onClose={() => setModalRow(null)} onSaved={() => { setModalRow(null); load() }} />
      )}
      {deleteRow && (
        <ConfirmDialog message={`Excluir registro de óleo do veículo ${deleteRow.veiculos?.codigo_vda ?? ''}?`}
          onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />
      )}
    </div>
  )
}
