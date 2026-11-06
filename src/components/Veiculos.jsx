import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Plus, RefreshCw, Edit2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'

const TIPOS = ['Caminhão Toco','Caminhão Truck','Caminhão','Cavalo Mecânico','Muck','Container','Acello','HR / Van','Carro','Outros']
const MOTIVOS_INATIVACAO = ['Vendido', 'Manutenção Longa', 'Sinistro', 'Aposentado', 'Outro']
const EMPTY = {
  codigo_vda: '', placa: '', descricao: '',
  tipo_veiculo: 'Caminhão', status_operacional: 'Ativo',
  motivo_inativacao: ''
}

function VeiculoModal({ row, onClose, onSaved }) {
  const isNew = !row?.id
  const [form, setForm] = useState(row ? { ...EMPTY, ...row } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.codigo_vda.trim()) { setErr('Código VDA é obrigatório'); return }
    setSaving(true); setErr('')
    const payload = {
      codigo_vda: form.codigo_vda.trim().toUpperCase(),
      placa: form.placa.trim().toUpperCase() || null,
      descricao: form.descricao.trim() || null,
      tipo_veiculo: form.tipo_veiculo,
      status_operacional: form.status_operacional,
      motivo_inativacao: form.status_operacional !== 'Ativo' ? (form.motivo_inativacao || null) : null,
    }
    const { error } = await (isNew
      ? supabase.from('fleet_veiculos').insert(payload)
      : supabase.from('fleet_veiculos').update(payload).eq('id', row.id))
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
            <label className="block text-xs text-gray-400 mb-1">Placa</label>
            <input value={form.placa || ''} onChange={e => set('placa', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white uppercase" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Descrição (marca/modelo)</label>
            <input value={form.descricao || ''} onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: VW CONSTELLATION 13.190"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
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
              <option>Ativo</option>
              <option>Inativo</option>
              <option>Manutenção</option>
            </select>
          </div>
          {form.status_operacional !== 'Ativo' && (
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Motivo da Inativação</label>
              <select value={form.motivo_inativacao || ''} onChange={e => set('motivo_inativacao', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Selecione o motivo…</option>
                {MOTIVOS_INATIVACAO.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}
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

function ToggleStatusModal({ row, onClose, onSaved }) {
  const ativando = row.status_operacional !== 'Ativo'
  const [motivo, setMotivo] = useState(row.motivo_inativacao || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function confirmar() {
    if (!ativando && !motivo) { setErr('Informe o motivo da inativação'); return }
    setSaving(true)
    const payload = ativando
      ? { status_operacional: 'Ativo', motivo_inativacao: null }
      : { status_operacional: 'Inativo', motivo_inativacao: motivo }
    const { error } = await supabase.from('fleet_veiculos').update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title={ativando ? 'Reativar Veículo' : 'Inativar Veículo'} onClose={onClose}>
      <div className="space-y-4">
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <p className="text-sm text-gray-300">
          Veículo: <span className="font-bold text-white">{row.codigo_vda}</span>
          {row.placa && <span className="text-gray-400"> — {row.placa}</span>}
        </p>
        {ativando ? (
          <p className="text-sm text-emerald-400">Este veículo será marcado como <strong>Ativo</strong>.</p>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Motivo da Inativação *</label>
            <select value={motivo} onChange={e => setMotivo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Selecione o motivo…</option>
              {MOTIVOS_INATIVACAO.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button onClick={confirmar} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 ${ativando ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-yellow-600 hover:bg-yellow-700'} disabled:opacity-50 text-white text-sm rounded-lg transition-colors`}>
            {ativando ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {saving ? 'Salvando…' : ativando ? 'Reativar' : 'Inativar'}
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
  const [toggleRow, setToggleRow] = useState(null)
  const [search, setSearch] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('ativos') // 'ativos' | 'historico'

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fleet_veiculos')
      .select('*')
      .order('codigo_vda')
    setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('vei-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_veiculos' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const ativos = rows.filter(r => r.status_operacional === 'Ativo')
  const inativos = rows.filter(r => r.status_operacional !== 'Ativo')

  const fonte = abaAtiva === 'ativos' ? ativos : inativos
  const filtered = fonte.filter(r => {
    const q = search.toLowerCase()
    return !q
      || r.codigo_vda?.toLowerCase().includes(q)
      || r.placa?.toLowerCase().includes(q)
      || r.descricao?.toLowerCase().includes(q)
  })

  if (loading) return <div className="text-center py-24 text-gray-500 text-sm">Carregando veículos…</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <input type="text" placeholder="Buscar veículo…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Frota total',    value: rows.length,    color: 'text-blue-400' },
          { label: 'Ativos',         value: ativos.length,  color: 'text-emerald-400' },
          { label: 'Inativos/Homem', value: inativos.length, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <Truck size={20} className={color} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {[
          { key: 'ativos',    label: `Ativos (${ativos.length})` },
          { key: 'historico', label: `Histórico / Inativos (${inativos.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setAbaAtiva(key)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${abaAtiva === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Código VDA', 'Placa', 'Descrição', 'Tipo', 'Status', abaAtiva === 'historico' ? 'Motivo' : '', 'Ações']
                  .filter(Boolean)
                  .map(h => (
                    <th key={h} className="text-left text-sm text-gray-400 font-semibold px-4 py-4">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    {search ? 'Nenhum resultado para a busca.' : 'Nenhum veículo encontrado.'}
                  </td>
                </tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${r.status_operacional !== 'Ativo' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-4 font-semibold text-white text-base" translate="no">{r.codigo_vda}</td>
                  <td className="px-4 py-4 text-gray-300 font-mono text-sm" translate="no">{r.placa || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-4 text-gray-300 text-sm" translate="no">{r.descricao || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-4 text-gray-300 text-sm" translate="no">{r.tipo_veiculo}</td>
                  <td className="px-4 py-4"><StatusBadge status={r.status_operacional} /></td>
                  {abaAtiva === 'historico' && (
                    <td className="px-4 py-4 text-sm text-yellow-400" translate="no">{r.motivo_inativacao || '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModalRow(r)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setToggleRow(r)} title={r.status_operacional === 'Ativo' ? 'Inativar' : 'Reativar'}
                        className={`p-1.5 rounded-lg transition-colors ${r.status_operacional === 'Ativo' ? 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>
                        {r.status_operacional === 'Ativo' ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modalRow !== null && (
        <VeiculoModal
          row={modalRow || null}
          onClose={() => setModalRow(null)}
          onSaved={() => { setModalRow(null); load() }}
        />
      )}
      {toggleRow && (
        <ToggleStatusModal
          row={toggleRow}
          onClose={() => setToggleRow(null)}
          onSaved={() => { setToggleRow(null); load() }}
        />
      )}
    </div>
  )
}
