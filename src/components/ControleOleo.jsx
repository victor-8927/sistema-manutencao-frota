import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Droplets, RefreshCw, Edit2, Trash2, Save, AlertTriangle, CheckCircle, Clock, Timer, MessageSquare } from 'lucide-react'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import StatusBadge from './StatusBadge'

function calcStatus(r) {
  // km_atual vem de fleet_veiculos (via PWA) ou fallback do próprio registro
  const kmAtual = r.fleet_veiculos?.km_atual ?? r.km_atual ?? 0
  const rod = kmAtual - (r.km_ultima_troca || 0)
  const lim = r.km_oleo_limite || 10000
  if (rod >= lim)       return { label: 'Ultrapassou Limite', color: 'red',    pct: 100 }
  if (rod >= lim * 0.9) return { label: 'Pronto p/ Troca',   color: 'yellow', pct: Math.round((rod/lim)*100) }
  return                       { label: 'Normal',             color: 'green',  pct: Math.round((rod/lim)*100) }
}

function fmtKm(v) { return (v ?? 0).toLocaleString('pt-BR') + ' km' }
function fmtDate(v) { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR') }

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
  // km_atual vem de fleet_veiculos (via PWA) — somente leitura no modal
  const kmAtualPwa = row?.fleet_veiculos?.km_atual ?? null
  const [form, setForm] = useState({
    veiculo_id:        row?.veiculo_id        ?? '',
    data_ultima_troca: row?.data_ultima_troca ?? new Date().toISOString().split('T')[0],
    km_ultima_troca:   row?.km_ultima_troca   ?? 0,
    km_oleo_limite:    row?.km_oleo_limite    ?? 10000,
    observacao:        row?.observacao        ?? '',
    usa_horimetro:     row?.usa_horimetro     ?? false,
    horimetro_limite:  row?.horimetro_limite  ?? 600,
  })
  const kmProximaTroca = Number(form.km_ultima_troca) + Number(form.km_oleo_limite)
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
      km_proxima_troca:  kmProximaTroca,
      km_oleo_limite:    Number(form.km_oleo_limite),
      observacao:        form.observacao || null,
      usa_horimetro:     form.usa_horimetro,
      horimetro_limite:  form.usa_horimetro ? Number(form.horimetro_limite) : null,
      data_atualizacao:  new Date().toISOString().split('T')[0],
      // km_atual NÃO é enviado — vem de fleet_veiculos via PWA/lançamento aprovado
    }
    const { error } = await (isNew
      ? supabase.from('fleet_controle_oleo').insert(payload)
      : supabase.from('fleet_controle_oleo').update(payload).eq('id', row.id))
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
            <label className="block text-xs text-gray-400 mb-1">KM Atual <span className="text-blue-400">(via PWA)</span></label>
            <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400">
              {kmAtualPwa != null ? (
                <span className="text-white font-medium">{kmAtualPwa.toLocaleString('pt-BR')} km</span>
              ) : (
                <span className="italic text-gray-500">Atualizado automaticamente ao aprovar lançamento</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Intervalo (km)</label>
            <input type="number" value={form.km_oleo_limite} onChange={e => set('km_oleo_limite', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Próxima Troca <span className="text-gray-600">(calculado)</span></label>
            <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300">
              {kmProximaTroca.toLocaleString('pt-BR')} km
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <input type="checkbox" id="usa_hor" checked={form.usa_horimetro} onChange={e => set('usa_horimetro', e.target.checked)}
            className="w-4 h-4 accent-blue-500" />
          <label htmlFor="usa_hor" className="text-sm text-gray-300 flex items-center gap-1.5">
            <Timer size={14} className="text-blue-400" /> Controle por Horímetro
          </label>
          {form.usa_horimetro && (
            <input type="number" value={form.horimetro_limite} onChange={e => set('horimetro_limite', e.target.value)}
              placeholder="Horas" className="ml-auto w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white" />
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Observação</label>
          <textarea rows={3} value={form.observacao} onChange={e => set('observacao', e.target.value)}
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
      // inclui km_atual e km_atualizado_em de fleet_veiculos como fonte de verdade
      supabase.from('fleet_controle_oleo').select('*, fleet_veiculos(id, codigo_vda, placa, km_atual, km_atualizado_em)').order('data_atualizacao', { ascending: false }),
      supabase.from('fleet_veiculos').select('id, codigo_vda, placa').order('codigo_vda'),
    ])
    setRows(ol || []); setVeiculos(vei || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('oleo-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fleet_controle_oleo' }, load)
      // escuta também fleet_veiculos para atualizar km em tempo real quando KM Diário aprovar
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fleet_veiculos' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  async function handleDelete() {
    await supabase.from('fleet_controle_oleo').delete().eq('id', deleteRow.id)
    setDeleteRow(null); load()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return !q || r.fleet_veiculos?.codigo_vda?.toLowerCase().includes(q) || r.fleet_veiculos?.placa?.toLowerCase().includes(q)
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
                {['Veículo','Placa','KM Atual','Data Troca','KM Ult. Troca','Próx. Troca','Intervalo','Rodado','Saldo','Atualizado','Status','Ações'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="text-center text-gray-500 py-10">Nenhum registro encontrado</td></tr>
              )}
              {filtered.map(r => {
                const kmAtual  = r.fleet_veiculos?.km_atual ?? r.km_atual ?? 0
                const kmViaPwa = r.fleet_veiculos?.km_atual != null
                const st       = calcStatus(r)
                const rod      = kmAtual - (r.km_ultima_troca || 0)
                const lim      = r.km_oleo_limite || 10000
                const saldo    = lim - rod
                const proxTroca = (r.km_ultima_troca || 0) + lim
                return (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    {/* Veículo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-white whitespace-nowrap">{r.fleet_veiculos?.codigo_vda ?? '—'}</span>
                        {r.usa_horimetro && (
                          <span className="flex items-center gap-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                            <Timer size={10} /> {r.horimetro_limite}h
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Placa */}
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.fleet_veiculos?.placa ?? '—'}</td>
                    {/* KM Atual */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-300">{fmtKm(kmAtual)}</span>
                      {kmViaPwa && (
                        <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">PWA</span>
                      )}
                    </td>
                    {/* Data Troca */}
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(r.data_ultima_troca)}</td>
                    {/* KM Ult. Troca */}
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtKm(r.km_ultima_troca)}</td>
                    {/* Próx. Troca */}
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtKm(proxTroca)}</td>
                    {/* Intervalo */}
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{lim.toLocaleString('pt-BR')} km</td>
                    {/* Rodado */}
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{fmtKm(rod)}</td>
                    {/* Saldo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1 min-w-[90px]">
                        <span className={`text-xs font-medium ${saldo < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                          {saldo < 0 ? `+${fmtKm(Math.abs(saldo))}` : fmtKm(saldo)}
                        </span>
                        <ProgressBar pct={st.pct} color={st.color} />
                      </div>
                    </td>
                    {/* Atualizado */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(r.data_atualizacao)}</td>
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={st.label} /></td>
                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.observacao && (
                          <span title={r.observacao} className="p-1.5 text-gray-500 cursor-help">
                            <MessageSquare size={14} />
                          </span>
                        )}
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
        <ConfirmDialog message={`Excluir registro de óleo do veículo ${deleteRow.fleet_veiculos?.codigo_vda ?? ''}?`}
          onConfirm={handleDelete} onCancel={() => setDeleteRow(null)} />
      )}
    </div>
  )
}
