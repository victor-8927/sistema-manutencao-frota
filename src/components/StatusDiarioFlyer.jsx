import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Download, RefreshCw } from 'lucide-react'

const STATUS_COLOR = {
  'Apto para a Rota':    { bg: '#16a34a', text: '#fff', icon: '✓' },
  'Apto para Serviço':   { bg: '#2563eb', text: '#fff', icon: '✓' },
  'Apto com Observação': { bg: '#d97706', text: '#fff', icon: '!' },
  'Inapto':              { bg: '#dc2626', text: '#fff', icon: '✗' },
  'Sem Status':          { bg: '#4b5563', text: '#fff', icon: '—' },
}

export default function StatusDiarioFlyer() {
  const [veiculos, setVeiculos] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const flyerRef = useRef(null)

  const today = new Date()
  const dataFmt = today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const dateKey = today.toISOString().slice(0, 10)

  async function load() {
    setLoading(true)
    const { data: vList } = await supabase
      .from('fleet_veiculos')
      .select('id,codigo_vda,placa,descricao,tipo_veiculo,status_operacional,observacao_manutencao')
      .in('status_operacional', ['Ativo', 'Manutenção'])
      .order('codigo_vda')

    const { data: sdList } = await supabase
      .from('fleet_status_diario')
      .select('*')
      .eq('data_status', dateKey)

    const map = {}
    if (sdList) sdList.forEach(s => { map[s.veiculo_id] = s })

    setVeiculos(vList || [])
    setStatusMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function downloadPNG() {
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(flyerRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' })
      const link = document.createElement('a')
      link.download = `status-frota-${dateKey}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      window.print()
    }
    setDownloading(false)
  }

  const apto   = veiculos.filter(v => statusMap[v.id]?.status_dia === 'Apto para a Rota').length
  const inapto = veiculos.filter(v => statusMap[v.id]?.status_dia === 'Inapto').length
  const semSt  = veiculos.filter(v => !statusMap[v.id]).length

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" /> Carregando status…
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Botão download */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Status da Frota — {dataFmt}</h2>
          <p className="text-xs text-gray-500">
            {apto} aptos · {inapto} inaptos · {semSt} sem lançamento
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={downloadPNG} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            <Download size={14} /> {downloading ? 'Gerando…' : 'Baixar PNG'}
          </button>
        </div>
      </div>

      {/* FLYER */}
      <div ref={flyerRef} style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '32px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        border: '2px solid #334155',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: '#06b6d4', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ❄️
            </div>
            <div>
              <div style={{ color: '#06b6d4', fontSize: '28px', fontWeight: '900', letterSpacing: '3px' }}>GELOCRIM</div>
              <div style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '2px' }}>PURA REFRESCÂNCIA</div>
            </div>
          </div>
          <div style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: '800', marginTop: '12px' }}>
            STATUS DA FROTA VDA
          </div>
          <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
            Compromisso com a operação e a disponibilidade da nossa frota!
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
            {dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1)}
          </div>
        </div>

        {/* Grid de veículos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {veiculos.map(v => {
            const sd = statusMap[v.id]
            const statusLabel = sd?.status_dia || (v.status_operacional === 'Manutenção' ? 'Inapto' : 'Sem Status')
            const cfg = STATUS_COLOR[statusLabel] || STATUS_COLOR['Sem Status']
            const obs = sd?.observacao || v.observacao_manutencao || ''

            return (
              <div key={v.id} style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderLeft: `4px solid ${cfg.bg}`,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: '800', fontSize: '15px' }}>{v.codigo_vda}</div>
                  {obs && (
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px', lineHeight: '1.4' }}>
                      {obs}
                    </div>
                  )}
                  {!obs && (
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>
                      {statusLabel === 'Apto para a Rota' || statusLabel === 'Sem Status' ? 'Apto para a rota.' : ''}
                    </div>
                  )}
                </div>
                <div style={{
                  background: cfg.bg,
                  color: cfg.text,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  minWidth: '100px',
                }}>
                  <div style={{ fontSize: '16px' }}>{cfg.icon === '✓' ? '✅' : cfg.icon === '✗' ? '❌' : cfg.icon === '!' ? '⚠️' : '➖'}</div>
                  <div style={{ marginTop: '2px' }}>{statusLabel.toUpperCase()}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Observações Importantes */}
        {veiculos.some(v => statusMap[v.id]?.observacao || v.observacao_manutencao) && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '14px', marginBottom: '10px' }}>
              📢 Observações Importantes:
            </div>
            {veiculos.filter(v => statusMap[v.id]?.observacao || v.observacao_manutencao).map(v => {
              const obs = statusMap[v.id]?.observacao || v.observacao_manutencao
              return (
                <div key={v.id} style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#06b6d4' }}>✓</span>
                  <span><strong>{v.codigo_vda}</strong> – {obs}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '16px' }}>
          {[
            { icon: '⚙️', label: 'Manutenção em dia' },
            { icon: '🚛', label: 'Frota em operação' },
            { icon: '🤝', label: 'Compromisso com o resultado' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '12px' }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right', color: '#334155', fontSize: '10px', marginTop: '12px' }}>
          Gerado em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
