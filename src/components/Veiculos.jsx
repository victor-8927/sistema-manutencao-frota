import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Plus, RefreshCw, Edit2, Trash2, Save } from 'lucide-react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import StatusBadge from './StatusBadge'

const TIPOS = ['Caminhão', 'Van', 'Caminhonete', 'Moto', 'Outro']
const STATUS = ['Ativo', 'Inativo', 'Manutenção']
const EMPTY = { codigo_vda: '', placa: '', tipo_veiculo: 'Caminhão', status_operacional: 'Ativo' }

function VeiculoModal({ row, onClose, onSaved }) {
  const isNew = !row?.id
  const [form, setForm] = useState(row ? { ...row } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.placa.trim()) { setErr('Placa é obrigatória'); return }
    if (!form.codigo_vda.trim()) { setErr('Código VDA é obrigatório'); return }
    setSaving(true); setErr('')
    const payload = {
      codigo_vda: form.codigo_vda.trim().toUpperCase(),
      placa: form.placa.trim().toUpperCase(),
      tipo_veiculo: form.tipo_veiculo,
      status_operacional: form.status_operacional,
    }
    const { error } = await (isNew
      ? supabase.from('veiculos').insert(payload)
      : supabase.from('veiculos').update(payload).eq('id', row.id))
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={isNew ? 'Novo Veículo' : 'Editar Veículo'} onClose={onClose}>
      <div className="space-y-4">
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Código VDA *</label>
            <input value={form.codigo_vda} onChange={e => set('codigo_vda', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white uppercase" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Placa *</label>
            <input value={form.placa} onChange={e => set('placa', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white uppercase" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo</label>
            <select value={form.tipo_veiculo} onChange={e => set('tipo_veiculo', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select value={form.status_operacional} onChange={e => set('status_operacional', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
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

export default function Veiculos() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalRow, setModalRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('veiculos').select('*').order('codigo_vda')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('vei-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  async function handleDelete() {
    await supabase.from('veiculos').delete().eq('id', deleteRow.id)
    setDeleteRow(null); load()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return !q || r.codigo_vda?.toLowerCase().includes(q) || r.placa?.toLowerCase().includes(q)
  })

  if (loading) return <div className="text-center py-24 text-gray-500 text-sm">Carregando veículos…</div>

  const ativos = rows.filter(r => r.status_operacional === 'Ativo').length

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
          <button onClick={() => setModalRow(false)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            <Plus size={14} /> Novo Veículo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Frota',  value: rows.length,        color: 'text-blue-400' },
          { label: 'Ativos',       value: ativos,             color: 'text-emerald-400' },
          { label: 'Inativos/Man', value: rows.length - ativos, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <Truck size={20} className={color} />
            <div><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs text-gray-400">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Código VDA','Placa','Tipo','Status','Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-10">Nenhum veículo encontrado</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{r.codigo_vda}</td>
                  <td className="px-4 py-3 text-gray-300">{r.placa}</td>
                  <td className="px-4 py-3 text-gray-400">{r.tipo_veiculo}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status_operacional} /></td>
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
      </div>

      {modalRow !== null && (
        <VeiculoModal row={modalRow || null} onClose={() => setModalRow(null)} onSaved={() => { setModalRow(null); load() }} />
      )}
      {deleteRow && (
        <ConfirmDialog message={`Excluir veículo ${deleteRow.codigo_vda} (${deleteRow.placa})?`}
          onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />
      )}
    </div>
  )
}
