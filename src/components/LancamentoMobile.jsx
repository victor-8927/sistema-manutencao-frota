import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MOTIVOS = ['Rota', 'Evento', 'Oficina', 'Serv. Externo']
const LS_KEY = 'pwa_rota_ativa'

function getRotaAtiva() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
function salvarRotaAtiva(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}
function limparRotaAtiva() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

export default function LancamentoMobile() {
  const [tela, setTela] = useState('home') // home | saida | retorno
  const [veiculos, setVeiculos] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [emRota, setEmRota] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null) // { tipo: 'ok'|'erro', texto }

  // Form saída
  const [saida, setSaida] = useState({
    motorista: '', veiculo_id: '', motivo: 'Rota',
    km_saida: '', horimetro_saida: ''
  })

  // Form retorno
  const [retorno, setRetorno] = useState({
    lancamento_id: '', motorista_retorno: '',
    km_retorno: '', horimetro_retorno: ''
  })

  // Rota ativa salva no localStorage deste celular
  const [rotaAtiva, setRotaAtiva] = useState(getRotaAtiva)

  useEffect(() => {
    carregarVeiculos()
    carregarMotoristas()
    carregarEmRota()
  }, [])

  // Quando entra na tela de retorno, pré-seleciona se há rota ativa de Rota
  useEffect(() => {
    if (tela === 'retorno' && rotaAtiva) {
      const lanc = emRota.find(l => l.id === rotaAtiva.lancamento_id)
      if (lanc) {
        setRetorno(r => ({
          ...r,
          lancamento_id: rotaAtiva.lancamento_id,
          motorista_retorno: rotaAtiva.motorista
        }))
      }
    }
  }, [tela, emRota, rotaAtiva])

  async function carregarVeiculos() {
    const { data } = await supabase
      .from('fleet_veiculos')
      .select('id, codigo_vda, placa, tipo_veiculo, categoria')
      .in('status_operacional', ['Ativo', 'Manutenção'])
      .neq('categoria', 'Gerência')
      .order('codigo_vda')
    setVeiculos(data || [])
  }

  async function carregarMotoristas() {
    const { data } = await supabase
      .from('fleet_motoristas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setMotoristas(data || [])
  }

  async function carregarEmRota() {
    const { data } = await supabase
      .from('lancamentos_diarios')
      .select('id, veiculo, motorista, motivo, km_saida, hora_saida, tipo_controle, valor_inicial')
      .eq('status', 'em_rota')
      .order('hora_saida', { ascending: false })
    setEmRota(data || [])
  }

  function showMsg(tipo, texto) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleSaida(e) {
    e.preventDefault()
    if (!saida.motorista || !saida.veiculo_id || !saida.motivo) {
      return showMsg('erro', 'Preencha todos os campos obrigatórios.')
    }
    if (!saida.km_saida) {
      return showMsg('erro', 'Informe o KM de saída.')
    }

    const veiculo = veiculos.find(v => v.id === saida.veiculo_id)
    const usaHorimetro = veiculo?.codigo_vda?.includes('94')

    if (usaHorimetro && !saida.horimetro_saida) {
      return showMsg('erro', 'Informe o horímetro de saída.')
    }

    setLoading(true)
    const agora = new Date().toISOString()
    const hoje = agora.slice(0, 10)

    const payload = {
      data: hoje,
      motorista: saida.motorista,
      veiculo: veiculo.codigo_vda,
      motivo: saida.motivo,
      tipo_controle: usaHorimetro ? 'horimetro' : 'km',
      km_saida: parseFloat(saida.km_saida),
      hora_saida: agora,
      valor_inicial: usaHorimetro ? parseFloat(saida.horimetro_saida) : 0,
      status: 'em_rota',
      updated_at: agora
    }

    const { data: inserted, error } = await supabase
      .from('lancamentos_diarios')
      .insert([payload])
      .select('id')
      .single()

    setLoading(false)

    if (error) {
      showMsg('erro', 'Erro ao registrar saída: ' + error.message)
    } else {
      // Se for Rota, salvar no localStorage deste celular
      if (saida.motivo === 'Rota' && inserted?.id) {
        const ativa = {
          lancamento_id: inserted.id,
          motorista: saida.motorista,
          veiculo: veiculo.codigo_vda
        }
        salvarRotaAtiva(ativa)
        setRotaAtiva(ativa)
      }
      showMsg('ok', `Saída registrada! ${veiculo.codigo_vda} em rota.`)
      setSaida({ motorista: '', veiculo_id: '', motivo: 'Rota', km_saida: '', horimetro_saida: '' })
      carregarEmRota()
      setTimeout(() => setTela('home'), 1500)
    }
  }

  async function handleRetorno(e) {
    e.preventDefault()
    if (!retorno.lancamento_id || !retorno.motorista_retorno || !retorno.km_retorno) {
      return showMsg('erro', 'Preencha todos os campos.')
    }

    const lanc = emRota.find(l => l.id === retorno.lancamento_id)
    const usaHorimetro = lanc?.tipo_controle === 'horimetro'

    if (usaHorimetro && !retorno.horimetro_retorno) {
      return showMsg('erro', 'Informe o horímetro de retorno.')
    }

    setLoading(true)
    const agora = new Date().toISOString()
    const kmS = lanc?.km_saida || 0
    const kmR = parseFloat(retorno.km_retorno)
    const totalKm = kmR - kmS

    const updates = {
      km_retorno: kmR,
      hora_retorno: agora,
      motorista_retorno: retorno.motorista_retorno,
      total_recorrido: usaHorimetro ? undefined : totalKm,
      status: 'pendente',
      updated_at: agora
    }

    if (usaHorimetro && retorno.horimetro_retorno) {
      updates.valor_final = parseFloat(retorno.horimetro_retorno)
      const hS = lanc?.valor_inicial || 0
      const hR = parseFloat(retorno.horimetro_retorno)
      updates.total_recorrido = Math.abs(hS - hR)
    }

    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k])

    const { error } = await supabase
      .from('lancamentos_diarios')
      .update(updates)
      .eq('id', retorno.lancamento_id)

    setLoading(false)

    if (error) {
      showMsg('erro', 'Erro ao registrar retorno: ' + error.message)
    } else {
      // Limpar rota ativa se era a rota deste celular
      if (rotaAtiva?.lancamento_id === retorno.lancamento_id) {
        limparRotaAtiva()
        setRotaAtiva(null)
      }
      showMsg('ok', 'Retorno registrado! Aguardando aprovação.')
      setRetorno({ lancamento_id: '', motorista_retorno: '', km_retorno: '', horimetro_retorno: '' })
      carregarEmRota()
      setTimeout(() => setTela('home'), 1500)
    }
  }

  const lancSelecionado = emRota.find(l => l.id === retorno.lancamento_id)
  const usaHorimetroRetorno = lancSelecionado?.tipo_controle === 'horimetro'

  // Retorno é de Rota deste celular? → pré-selecionado, sem dropdown
  const retornoAutomatico = rotaAtiva && lancSelecionado && lancSelecionado.id === rotaAtiva.lancamento_id

  return (
    <div style={{
      minHeight: '100vh', background: '#020617', color: '#f1f5f9',
      fontFamily: 'system-ui, sans-serif', padding: '0'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
        padding: '20px 20px 16px', borderBottom: '1px solid #1e40af'
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa', letterSpacing: 1 }}>
          GELOCRIM
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
          Registro Diário de Campo
        </div>
      </div>

      {/* Msg feedback */}
      {msg && (
        <div style={{
          margin: '12px 16px', padding: '12px 16px', borderRadius: 8,
          background: msg.tipo === 'ok' ? '#064e3b' : '#7f1d1d',
          border: `1px solid ${msg.tipo === 'ok' ? '#10b981' : '#ef4444'}`,
          color: msg.tipo === 'ok' ? '#6ee7b7' : '#fca5a5',
          fontSize: 14
        }}>
          {msg.tipo === 'ok' ? '✅ ' : '❌ '}{msg.texto}
        </div>
      )}

      {/* HOME */}
      {tela === 'home' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>

          {/* Alerta: rota ativa neste celular */}
          {rotaAtiva && (
            <div style={{
              background: '#1a2e1a', border: '1px solid #16a34a',
              borderRadius: 10, padding: 14, marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>
                📱 SAÍDA REGISTRADA NESTE CELULAR
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }} translate="no">{rotaAtiva.veiculo}</div>
              <div style={{ fontSize: 12, color: '#86efac' }}>{rotaAtiva.motorista} · Rota</div>
            </div>
          )}

          {/* Veículos em rota */}
          {emRota.length > 0 && (
            <div style={{
              background: '#1e1b4b', border: '1px solid #4338ca',
              borderRadius: 10, padding: 14, marginBottom: 24
            }}>
              <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 10 }}>
                🚗 EM ROTA AGORA ({emRota.length})
              </div>
              {emRota.map(l => (
                <div key={l.id} style={{
                  borderTop: '1px solid #312e81', paddingTop: 8, marginTop: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }} translate="no">{l.veiculo}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.motorista} · {l.motivo}</div>
                  </div>
                  <div style={{
                    fontSize: 10, background: '#dc2626', color: '#fff',
                    padding: '2px 8px', borderRadius: 20, fontWeight: 700
                  }}>
                    EM ROTA
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botões principais */}
          <button onClick={() => setTela('saida')} style={{
            width: '100%', padding: '18px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}>
            🚀 REGISTRAR SAÍDA
          </button>

          <button onClick={() => { carregarEmRota(); setTela('retorno') }} style={{
            width: '100%', padding: '18px', borderRadius: 12, border: 'none',
            background: emRota.length > 0
              ? 'linear-gradient(135deg, #065f46, #064e3b)'
              : '#1e293b',
            color: emRota.length > 0 ? '#6ee7b7' : '#475569',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
          }}>
            🏁 REGISTRAR RETORNO
            {emRota.length > 0 && (
              <span style={{
                background: '#dc2626', color: '#fff',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700
              }}>{emRota.length}</span>
            )}
          </button>
        </div>
      )}

      {/* SAÍDA */}
      {tela === 'saida' && (
        <form onSubmit={handleSaida} style={{ padding: '20px 16px' }}>
          <button type="button" onClick={() => setTela('home')} style={{
            background: 'none', border: 'none', color: '#60a5fa',
            fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0
          }}>← Voltar</button>

          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#60a5fa' }}>
            🚀 SAÍDA DE VEÍCULO
          </div>

          {/* Motivo */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>MOTIVO DA SAÍDA</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MOTIVOS.map(m => (
                <button key={m} type="button"
                  onClick={() => setSaida(s => ({ ...s, motivo: m }))}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: saida.motivo === m ? '#3b82f6' : '#334155',
                    background: saida.motivo === m ? '#1d4ed8' : '#0f172a',
                    color: saida.motivo === m ? '#fff' : '#94a3b8',
                    fontSize: 13, cursor: 'pointer', fontWeight: saida.motivo === m ? 700 : 400
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Motorista — dropdown da tabela */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>MOTORISTA</label>
            <select style={inputStyle}
              value={saida.motorista}
              onChange={e => setSaida(s => ({ ...s, motorista: e.target.value }))}>
              <option value="">Selecione o motorista</option>
              {motoristas.map(m => (
                <option key={m.id} value={m.nome}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Veículo */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>VEÍCULO</label>
            <select style={inputStyle}
              value={saida.veiculo_id}
              onChange={e => setSaida(s => ({ ...s, veiculo_id: e.target.value }))}>
              <option value="">Selecione o veículo</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>{v.codigo_vda} — {v.placa}</option>
              ))}
            </select>
          </div>

          {/* KM Saída */}
          <div style={{ marginBottom: 16 }}>
            <label style={lblStyle}>KM SAÍDA (odômetro)</label>
            <input style={inputStyle} type="number" inputMode="numeric"
              placeholder="Ex: 223400"
              value={saida.km_saida}
              onChange={e => setSaida(s => ({ ...s, km_saida: e.target.value }))} />
          </div>

          {/* Horímetro — só VDA 94 */}
          {saida.veiculo_id && veiculos.find(v => v.id === saida.veiculo_id)?.codigo_vda?.includes('94') && (
            <div style={{
              background: '#1c1917', border: '1px solid #78350f',
              borderRadius: 8, padding: 12, marginBottom: 16
            }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>
                ⏱ HORÍMETRO — VDA 94
              </div>
              <label style={lblStyle}>HORÍMETRO SAÍDA</label>
              <input style={inputStyle} type="number" inputMode="decimal"
                placeholder="Ex: 425"
                value={saida.horimetro_saida}
                onChange={e => setSaida(s => ({ ...s, horimetro_saida: e.target.value }))} />
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 16, borderRadius: 10, border: 'none',
            background: loading ? '#334155' : 'linear-gradient(135deg, #1d4ed8, #1e40af)',
            color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 8
          }}>
            {loading ? 'Registrando...' : '🚀 LANÇAR SAÍDA'}
          </button>
        </form>
      )}

      {/* RETORNO */}
      {tela === 'retorno' && (
        <form onSubmit={handleRetorno} style={{ padding: '20px 16px' }}>
          <button type="button" onClick={() => setTela('home')} style={{
            background: 'none', border: 'none', color: '#60a5fa',
            fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0
          }}>← Voltar</button>

          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#10b981' }}>
            🏁 RETORNO DE VEÍCULO
          </div>

          {emRota.length === 0 ? (
            <div style={{
              background: '#0f172a', border: '1px solid #334155',
              borderRadius: 10, padding: 24, textAlign: 'center', color: '#475569'
            }}>
              Nenhum veículo em rota no momento.
            </div>
          ) : (
            <>
              {/* Card fixo se rota ativa deste celular, dropdown se não */}
              <div style={{ marginBottom: 16 }}>
                <label style={lblStyle}>VEÍCULO RETORNANDO</label>

                {retornoAutomatico ? (
                  /* Pré-selecionado — rota registrada neste celular */
                  <div style={{
                    background: '#1a2e1a', border: '2px solid #16a34a',
                    borderRadius: 8, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }} translate="no">
                        {rotaAtiva.veiculo}
                      </div>
                      <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>
                        📱 Saída registrada neste celular
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, background: '#16a34a', color: '#fff',
                      padding: '3px 10px', borderRadius: 20, fontWeight: 700
                    }}>
                      ✓ AUTO
                    </div>
                  </div>
                ) : (
                  /* Dropdown manual — Evento/Oficina/Externo ou celular diferente */
                  <select style={inputStyle}
                    value={retorno.lancamento_id}
                    onChange={e => setRetorno(r => ({ ...r, lancamento_id: e.target.value }))}>
                    <option value="">Selecione o veículo</option>
                    {emRota.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.veiculo} — {l.motorista} ({l.motivo})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Info saída */}
              {lancSelecionado && (
                <div style={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12
                }}>
                  <div style={{ color: '#94a3b8' }}>
                    Saída: <strong style={{ color: '#f1f5f9' }}>
                      {lancSelecionado.hora_saida
                        ? new Date(lancSelecionado.hora_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </strong>
                    {' · '}KM saída: <strong style={{ color: '#f1f5f9' }}>{lancSelecionado.km_saida?.toLocaleString('pt-BR') || '—'}</strong>
                  </div>
                </div>
              )}

              {/* Motorista retorno */}
              <div style={{ marginBottom: 16 }}>
                <label style={lblStyle}>MOTORISTA DO RETORNO</label>
                {retornoAutomatico ? (
                  /* Pré-preenchido e bloqueado */
                  <div style={{
                    ...inputStyle,
                    color: '#86efac', background: '#0f1f0f',
                    borderColor: '#16a34a', display: 'flex', alignItems: 'center'
                  }}>
                    {rotaAtiva.motorista}
                  </div>
                ) : (
                  <select style={inputStyle}
                    value={retorno.motorista_retorno}
                    onChange={e => setRetorno(r => ({ ...r, motorista_retorno: e.target.value }))}>
                    <option value="">Selecione o motorista</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* KM Retorno */}
              <div style={{ marginBottom: 16 }}>
                <label style={lblStyle}>KM RETORNO (odômetro)</label>
                <input style={inputStyle} type="number" inputMode="numeric"
                  placeholder="Ex: 223445"
                  value={retorno.km_retorno}
                  onChange={e => setRetorno(r => ({ ...r, km_retorno: e.target.value }))} />
                {retorno.km_retorno && lancSelecionado?.km_saida && (
                  <div style={{ fontSize: 12, color: '#10b981', marginTop: 6 }}>
                    ✅ Total percorrido: {(parseFloat(retorno.km_retorno) - lancSelecionado.km_saida).toLocaleString('pt-BR')} km
                  </div>
                )}
              </div>

              {/* Horímetro retorno — só VDA 94 */}
              {usaHorimetroRetorno && (
                <div style={{
                  background: '#1c1917', border: '1px solid #78350f',
                  borderRadius: 8, padding: 12, marginBottom: 16
                }}>
                  <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>
                    ⏱ HORÍMETRO — VDA 94
                  </div>
                  <label style={lblStyle}>HORÍMETRO RETORNO</label>
                  <input style={inputStyle} type="number" inputMode="decimal"
                    placeholder="Ex: 418"
                    value={retorno.horimetro_retorno}
                    onChange={e => setRetorno(r => ({ ...r, horimetro_retorno: e.target.value }))} />
                  {retorno.horimetro_retorno && lancSelecionado?.valor_inicial && (
                    <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
                      ⏱ Total: {Math.abs(lancSelecionado.valor_inicial - parseFloat(retorno.horimetro_retorno)).toFixed(1)} h
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 16, borderRadius: 10, border: 'none',
                background: loading ? '#334155' : 'linear-gradient(135deg, #065f46, #047857)',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8
              }}>
                {loading ? 'Registrando...' : '🏁 LANÇAR RETORNO'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  )
}

const lblStyle = {
  display: 'block', fontSize: 11, color: '#64748b',
  fontWeight: 700, letterSpacing: 1, marginBottom: 6
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #334155', background: '#0f172a',
  color: '#f1f5f9', fontSize: 15, boxSizing: 'border-box',
  outline: 'none'
}
