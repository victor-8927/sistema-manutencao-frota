import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Navigation, Minus } from 'lucide-react';

const STATUS_BADGE = {
  pendente:     { label: 'Pendente',     cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  aprovado:     { label: 'Aprovado',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejeitado:    { label: 'Rejeitado',    cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  em_rota:      { label: 'Em Rota',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  sem_registro: { label: 'Sem Registro', cls: 'bg-slate-700/50 text-slate-400 border-slate-600/50' },
};

function fmtHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function LancamentosDiarios() {
  const today = new Date().toISOString().slice(0, 10);
  const [filtroData, setFiltroData] = useState(today);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [lancamentos, setLancamentos] = useState([]);
  const [emRota, setEmRota] = useState([]);
  const [veiculosFrota, setVeiculosFrota] = useState([]); // veículos do Óleo/Tacógrafo
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);

    // Veículos em rota (sem filtro de data)
    const { data: rota } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('status', 'em_rota')
      .order('hora_saida', { ascending: false });
    setEmRota(rota || []);

    // Veículos da frota operacional = os que têm registro em fleet_controle_oleo
    // (mesmo conjunto do Óleo e Tacógrafos — exclui containers, Virtus, Gerência)
    const { data: frota } = await supabase
      .from('fleet_controle_oleo')
      .select('veiculo_id, fleet_veiculos(id, codigo_vda, placa, km_atual)');
    setVeiculosFrota(frota || []);

    // Lançamentos com filtros (excluindo em_rota)
    let q = supabase
      .from('lancamentos_diarios')
      .select('*')
      .neq('status', 'em_rota')
      .order('hora_saida', { ascending: false, nullsFirst: false });

    if (filtroData) q = q.eq('data', filtroData);
    if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus);

    const { data, error } = await q;
    if (error) console.error(error);
    setLancamentos(data || []);
    setLoading(false);
  };

  useEffect(() => { buscar(); }, [filtroData, filtroStatus]);

  const aprovar = async (id) => {
    const lanc = lancamentos.find(l => l.id === id);

    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({ status: 'aprovado' })
      .eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }

    if (lanc?.km_retorno && lanc?.veiculo) {
      const { data: vei } = await supabase
        .from('fleet_veiculos')
        .select('id')
        .eq('codigo_vda', lanc.veiculo)
        .single();
      if (vei?.id) {
        await supabase
          .from('fleet_veiculos')
          .update({ km_atual: lanc.km_retorno, km_atualizado_em: new Date().toISOString() })
          .eq('id', vei.id);
        await supabase
          .from('fleet_controle_oleo')
          .update({ km_atual: lanc.km_retorno, data_atualizacao: new Date().toISOString() })
          .eq('veiculo_id', vei.id);
      }
    }
    buscar();
  };

  const rejeitar = async (id) => {
    if (!window.confirm('Rejeitar este lançamento?')) return;
    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({ status: 'rejeitado' })
      .eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    buscar();
  };

  // Monta lista completa: lançamentos do dia + veículos sem registro
  const emRotaIds = new Set(emRota.map(r => r.veiculo));
  const lancVeiculos = new Set(lancamentos.map(l => l.veiculo));

  // Veículos da frota sem lançamento no dia e não em rota
  const semRegistro = filtroStatus === 'todos' || filtroStatus === 'sem_registro'
    ? veiculosFrota
        .filter(f => {
          const cod = f.fleet_veiculos?.codigo_vda;
          return cod && !lancVeiculos.has(cod) && !emRotaIds.has(cod);
        })
        .map(f => ({ _semRegistro: true, veiculo: f.fleet_veiculos?.codigo_vda, placa: f.fleet_veiculos?.placa, km_atual: f.fleet_veiculos?.km_atual }))
    : [];

  const totalKm = lancamentos
    .filter(l => l.status === 'aprovado')
    .reduce((acc, l) => acc + Number(l.total_recorrido || 0), 0);

  const pendentes = lancamentos.filter(l => l.status === 'pendente').length;
  const totalFrota = veiculosFrota.length;
  const comRegistro = lancamentos.length + emRota.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">KM Diário — Validação</h2>
          <p className="text-xs text-slate-400">
            Status da frota operacional · {comRegistro}/{totalFrota} veículos com registro
          </p>
        </div>
        <button onClick={buscar}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Veículos EM ROTA agora */}
      {emRota.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Navigation size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">
              Em Rota Agora — {emRota.length} veículo{emRota.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {emRota.map(item => (
              <div key={item.id}
                className="bg-slate-900/60 border border-blue-500/20 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white text-sm" translate="no">{item.veiculo}</span>
                  <span className="ml-2 text-xs text-slate-400">{item.motorista}</span>
                  {item.motivo && (
                    <span className="ml-2 text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">{item.motivo}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Saída: <span className="text-slate-200 font-medium">{fmtHora(item.hora_saida)}</span>
                  {item.km_saida && (
                    <> · KM: <span className="text-slate-200 font-medium">{Number(item.km_saida).toLocaleString('pt-BR')}</span></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Pendentes</div>
          <div className="text-2xl font-black text-amber-400">{pendentes}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total KM Aprovado</div>
          <div className="text-2xl font-black text-emerald-400">{totalKm.toLocaleString('pt-BR')} km</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Lançamentos</div>
          <div className="text-2xl font-black text-blue-400">{lancamentos.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Sem Registro</div>
          <div className="text-2xl font-black text-slate-500">{semRegistro.length + (filtroStatus === 'todos' ? 0 : 0)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Data</label>
          <input type="date" value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Status</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovados</option>
            <option value="rejeitado">Rejeitados</option>
          </select>
        </div>
        {filtroData && (
          <button onClick={() => setFiltroData('')}
            className="mt-5 text-xs text-slate-500 hover:text-white transition-colors">
            Ver todos os dias
          </button>
        )}
      </div>

      {/* Lista lançamentos + sem registro */}
      {loading ? (
        <div className="text-center text-slate-500 py-12 text-sm">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {/* Lançamentos com registro */}
          {lancamentos.map(item => {
            const sb = STATUS_BADGE[item.status] || STATUS_BADGE.pendente;
            const kmPercorrido = item.km_retorno && item.km_saida
              ? Number(item.km_retorno) - Number(item.km_saida)
              : Number(item.total_recorrido || 0);
            const usaHorimetro = item.tipo_controle === 'horimetro';

            return (
              <div key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm bg-slate-800 px-2 py-0.5 rounded border border-slate-700" translate="no">
                      {item.veiculo}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${sb.cls}`}>
                      {sb.label}
                    </span>
                    {item.motivo && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.motivo}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">📅 {item.data}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Saída: <strong className="text-blue-300">{item.motorista}</strong>
                    {item.motorista_retorno && item.motorista_retorno !== item.motorista && (
                      <> · Retorno: <strong className="text-purple-300">{item.motorista_retorno}</strong></>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    🕐 {fmtHora(item.hora_saida)}
                    {item.hora_retorno && <> → {fmtHora(item.hora_retorno)}</>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {usaHorimetro ? '⏱ Hor.' : '🛣 KM'} saída:{' '}
                    <span className="text-slate-200">
                      {item.km_saida ? Number(item.km_saida).toLocaleString('pt-BR') : '—'}
                    </span>
                    {item.km_retorno && (
                      <> → retorno: <span className="text-slate-200">{Number(item.km_retorno).toLocaleString('pt-BR')}</span></>
                    )}
                    {kmPercorrido > 0 && (
                      <> · <strong className="text-emerald-400">+{kmPercorrido.toLocaleString('pt-BR')} {usaHorimetro ? 'h' : 'km'}</strong></>
                    )}
                  </p>
                </div>

                {item.status === 'pendente' && (
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button onClick={() => aprovar(item.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors">
                      <CheckCircle size={13} /> Aprovar
                    </button>
                    <button onClick={() => rejeitar(item.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white px-3 py-2 rounded-lg text-xs border border-rose-500/30 transition-colors">
                      <XCircle size={13} /> Rejeitar
                    </button>
                  </div>
                )}

                {item.status !== 'pendente' && (
                  <div className="shrink-0">
                    {item.status === 'aprovado'
                      ? <CheckCircle size={20} className="text-emerald-400" />
                      : <XCircle size={20} className="text-rose-400" />}
                  </div>
                )}
              </div>
            );
          })}

          {/* Veículos SEM registro no dia */}
          {semRegistro.map(item => (
            <div key={`sr-${item.veiculo}`}
              className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 opacity-70">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-slate-400 text-sm bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50" translate="no">
                    {item.veiculo}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_BADGE.sem_registro.cls}`}>
                    Sem Registro
                  </span>
                  {item.placa && (
                    <span className="text-xs text-slate-600">{item.placa}</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  🛣 KM atual:{' '}
                  <span className="text-slate-500">
                    {item.km_atual ? Number(item.km_atual).toLocaleString('pt-BR') + ' km' : '—'}
                  </span>
                  {' · '}0 km percorridos registrados
                </p>
              </div>
              <div className="shrink-0">
                <Minus size={18} className="text-slate-700" />
              </div>
            </div>
          ))}

          {lancamentos.length === 0 && semRegistro.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-sm">
              {filtroStatus === 'pendente'
                ? '✅ Nenhum lançamento pendente. Tudo validado!'
                : 'Nenhum dado encontrado para este filtro.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
