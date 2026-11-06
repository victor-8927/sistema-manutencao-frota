import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Truck, Navigation, CalendarDays, CheckCircle, XCircle, Plus, Clock } from 'lucide-react';

function fmtHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtData(d) {
  if (!d) return '—';
  const [y, m, dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}

const MODAL_EVENTO_VAZIO = {
  veiculo: '', nome_evento: '', local_evento: '', data: new Date().toISOString().slice(0, 10),
  retorno_previsto: '', km_saida: '', motorista: '', observacao: ''
};
const MODAL_RETORNO_VAZIO = { id: null, veiculo: '', km_retorno: '', observacao: '' };
const MODAL_SEM_MOV_VAZIO = { veiculo: '', data: new Date().toISOString().slice(0, 10), motivo: '' };

export default function PainelAnalista() {
  const [frota, setFrota] = useState([]);
  const [emRota, setEmRota] = useState([]);
  const [lancamentosHoje, setLancamentosHoje] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalEvento, setModalEvento] = useState(false);
  const [evento, setEvento] = useState(MODAL_EVENTO_VAZIO);

  const [modalRetorno, setModalRetorno] = useState(false);
  const [retorno, setRetorno] = useState(MODAL_RETORNO_VAZIO);

  const [modalSemMov, setModalSemMov] = useState(false);
  const [semMov, setSemMov] = useState(MODAL_SEM_MOV_VAZIO);

  const [salvando, setSalvando] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);

  const buscar = async () => {
    setLoading(true);

    // Frota operacional com dados do veículo
    const { data: frotaData } = await supabase
      .from('fleet_controle_oleo')
      .select('veiculo_id, fleet_veiculos(id, codigo_vda, placa, km_atual, status_operacional, motivo_manutencao)');
    setFrota(frotaData || []);

    // Em rota agora (todos os dias)
    const { data: rotaData } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('status', 'em_rota')
      .order('hora_saida', { ascending: false });
    setEmRota(rotaData || []);

    // Lançamentos de hoje (pendente/aprovado/rejeitado)
    const { data: hojeLanc } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('data', hoje)
      .neq('status', 'em_rota')
      .order('hora_saida', { ascending: false });
    setLancamentosHoje(hojeLanc || []);

    setLoading(false);
  };

  useEffect(() => { buscar(); }, []);

  // Classificação dos veículos
  const emRotaSet = new Set(emRota.map(r => r.veiculo));
  const hojeSet = new Set(lancamentosHoje.map(l => l.veiculo));

  const veiculosClassificados = frota.map(f => {
    const cod = f.fleet_veiculos?.codigo_vda;
    const statusOp = f.fleet_veiculos?.status_operacional;
    const lancRota = emRota.find(r => r.veiculo === cod);
    const lancHoje = lancamentosHoje.find(l => l.veiculo === cod);

    let grupo = 'disponivel';
    if (statusOp && statusOp !== 'Ativo') grupo = 'manutencao';
    else if (emRotaSet.has(cod)) grupo = 'em_rota';
    else if (lancHoje?.tipo === 'evento' && lancHoje?.status !== 'rejeitado') grupo = 'evento_registrado';
    else if (hojeSet.has(cod)) grupo = 'registrado';

    return { ...f, cod, grupo, lancRota, lancHoje };
  });

  const emRotaList = veiculosClassificados.filter(v => v.grupo === 'em_rota');
  const eventoList = veiculosClassificados.filter(v => v.grupo === 'evento_registrado');
  const disponivelList = veiculosClassificados.filter(v => v.grupo === 'disponivel');
  const registradoList = veiculosClassificados.filter(v => v.grupo === 'registrado');
  const manutencaoList = veiculosClassificados.filter(v => v.grupo === 'manutencao');

  // Salvar evento
  const salvarEvento = async () => {
    if (!evento.veiculo) { alert('Selecione o veículo.'); return; }
    if (!evento.nome_evento) { alert('Informe o nome do evento.'); return; }
    setSalvando(true);

    const obs = [
      evento.nome_evento,
      evento.local_evento && `Local: ${evento.local_evento}`,
      evento.retorno_previsto && `Retorno previsto: ${fmtData(evento.retorno_previsto)}`,
      evento.observacao,
    ].filter(Boolean).join(' · ');

    const { error } = await supabase.from('lancamentos_diarios').insert([{
      veiculo: evento.veiculo,
      tipo: 'evento',
      data: evento.data,
      status: 'pendente',
      motorista: evento.motorista || 'Analista',
      km_saida: evento.km_saida ? Number(evento.km_saida) : null,
      observacao: obs || null,
    }]);

    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }
    setModalEvento(false);
    setEvento(MODAL_EVENTO_VAZIO);
    buscar();
  };

  // Confirmar retorno de evento
  const salvarRetorno = async () => {
    if (!retorno.km_retorno) { alert('Informe o KM de retorno.'); return; }
    setSalvando(true);

    // Busca lançamento fresco
    const { data: lancFresh } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('id', retorno.id)
      .single();

    const kmRodado = lancFresh?.km_saida
      ? Number(retorno.km_retorno) - Number(lancFresh.km_saida)
      : null;

    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({
        km_retorno: Number(retorno.km_retorno),
        hora_retorno: new Date().toISOString(),
        total_recorrido: kmRodado,
        status: 'pendente',
        observacao: retorno.observacao || lancFresh?.observacao || null,
      })
      .eq('id', retorno.id);

    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }
    setModalRetorno(false);
    setRetorno(MODAL_RETORNO_VAZIO);
    buscar();
  };

  // Registrar sem movimento
  const salvarSemMovimento = async () => {
    if (!semMov.veiculo) { alert('Selecione o veículo.'); return; }
    setSalvando(true);

    const { error } = await supabase.from('lancamentos_diarios').insert([{
      veiculo: semMov.veiculo,
      tipo: 'sem_movimento',
      data: semMov.data,
      status: 'pendente',
      motorista: 'Analista',
      observacao: semMov.motivo || 'Veículo não saiu no dia',
    }]);

    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }
    setModalSemMov(false);
    setSemMov(MODAL_SEM_MOV_VAZIO);
    buscar();
  };

  const abrirRetorno = (lanc) => {
    setRetorno({ id: lanc.id, veiculo: lanc.veiculo, km_retorno: '', observacao: '' });
    setModalRetorno(true);
  };

  const veiculosDisponiveis = frota
    .filter(f => f.fleet_veiculos?.status_operacional === 'Ativo')
    .map(f => f.fleet_veiculos);

  const preencherDadosPWA = (cod) => {
    const lancRota = emRota.find(r => r.veiculo === cod);
    if (!lancRota) return;
    setEvento(p => ({
      ...p,
      veiculo: cod,
      motorista: lancRota.motorista || p.motorista,
      km_saida: lancRota.km_saida ? String(lancRota.km_saida) : p.km_saida,
      data: lancRota.hora_saida
        ? new Date(lancRota.hora_saida).toISOString().slice(0, 10)
        : p.data,
    }));
  };

  return (
    <div className="space-y-5">

      {/* Modal Evento */}
      {modalEvento && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays size={16} className="text-purple-400" /> Lançar Evento
              </h3>
              <button onClick={() => { setModalEvento(false); setEvento(MODAL_EVENTO_VAZIO); }}
                className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Veículo *</label>
                <select value={evento.veiculo} onChange={e => { setEvento(p => ({ ...p, veiculo: e.target.value })); preencherDadosPWA(e.target.value); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
                  <option value="">Selecione...</option>
                  {veiculosDisponiveis.map(v => (
                    <option key={v.id} value={v.codigo_vda}>{v.codigo_vda} {v.placa ? `· ${v.placa}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Evento *</label>
                <input type="text" value={evento.nome_evento}
                  onChange={e => setEvento(p => ({ ...p, nome_evento: e.target.value }))}
                  placeholder="ex: Carnaval 2026, Show Arena, Festa Junina"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Local</label>
                <input type="text" value={evento.local_evento}
                  onChange={e => setEvento(p => ({ ...p, local_evento: e.target.value }))}
                  placeholder="ex: Sambódromo, Arena da Amazônia"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Motorista</label>
                <input type="text" value={evento.motorista}
                  onChange={e => setEvento(p => ({ ...p, motorista: e.target.value }))}
                  placeholder="Nome do motorista"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data Saída</label>
                  <input type="date" value={evento.data}
                    onChange={e => setEvento(p => ({ ...p, data: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Retorno Previsto</label>
                  <input type="date" value={evento.retorno_previsto}
                    onChange={e => setEvento(p => ({ ...p, retorno_previsto: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">KM Saída</label>
                <input type="number" value={evento.km_saida}
                  onChange={e => setEvento(p => ({ ...p, km_saida: e.target.value }))}
                  placeholder="ex: 325000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Observação</label>
                <input type="text" value={evento.observacao}
                  onChange={e => setEvento(p => ({ ...p, observacao: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={salvarEvento} disabled={salvando}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {salvando ? 'Salvando...' : 'Registrar Evento → Pendente'}
              </button>
              <button onClick={() => { setModalEvento(false); setEvento(MODAL_EVENTO_VAZIO); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Retorno */}
      {modalRetorno && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" /> Confirmar Retorno
              </h3>
              <button onClick={() => setModalRetorno(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-slate-400">
              Veículo: <span className="text-white font-bold" translate="no">{retorno.veiculo}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">KM Retorno *</label>
                <input type="number" value={retorno.km_retorno}
                  onChange={e => setRetorno(p => ({ ...p, km_retorno: e.target.value }))}
                  placeholder="ex: 326500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Observação</label>
                <input type="text" value={retorno.observacao}
                  onChange={e => setRetorno(p => ({ ...p, observacao: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={salvarRetorno} disabled={salvando}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {salvando ? 'Salvando...' : 'Confirmar Retorno → Pendente'}
              </button>
              <button onClick={() => setModalRetorno(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sem Movimento */}
      {modalSemMov && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle size={16} className="text-slate-400" /> Sem Movimento
              </h3>
              <button onClick={() => setModalSemMov(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Veículo *</label>
                <select value={semMov.veiculo} onChange={e => setSemMov(p => ({ ...p, veiculo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500">
                  <option value="">Selecione...</option>
                  {veiculosDisponiveis.map(v => (
                    <option key={v.id} value={v.codigo_vda}>{v.codigo_vda} {v.placa ? `· ${v.placa}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data</label>
                <input type="date" value={semMov.data}
                  onChange={e => setSemMov(p => ({ ...p, data: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Motivo (opcional)</label>
                <input type="text" value={semMov.motivo}
                  onChange={e => setSemMov(p => ({ ...p, motivo: e.target.value }))}
                  placeholder="ex: Sem carga, Folga do motorista"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={salvarSemMovimento} disabled={salvando}
                className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
              <button onClick={() => setModalSemMov(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Painel do Analista</h2>
          <p className="text-xs text-slate-400">
            Controle de distribuição · {frota.length} veículos · {emRotaList.length} em rota agora
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setModalEvento(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
            <CalendarDays size={13} /> Lançar Evento
          </button>
          <button onClick={() => setModalSemMov(true)}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
            <XCircle size={13} /> Sem Movimento
          </button>
          <button onClick={buscar}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4">
          <div className="text-xs text-blue-400 mb-1">Em Rota Agora</div>
          <div className="text-2xl font-black text-blue-300">{emRotaList.length}</div>
        </div>
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-4">
          <div className="text-xs text-purple-400 mb-1">Em Evento</div>
          <div className="text-2xl font-black text-purple-300">{eventoList.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Disponíveis</div>
          <div className="text-2xl font-black text-slate-300">{disponivelList.length}</div>
        </div>
        <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-4">
          <div className="text-xs text-orange-400 mb-1">Manutenção</div>
          <div className="text-2xl font-black text-orange-300">{manutencaoList.length}</div>
        </div>
      </div>

      {/* Em Rota Agora */}
      {emRotaList.length > 0 && (
        <section>
          <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
            <Navigation size={11} /> Em Rota Agora — {emRotaList.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {emRotaList.map(v => (
              <div key={v.veiculo_id}
                className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm" translate="no">{v.cod}</span>
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">Em Rota</span>
                </div>
                {v.fleet_veiculos?.placa && <span className="text-xs text-slate-500">{v.fleet_veiculos.placa}</span>}
                {v.lancRota && (
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>Motorista: <span className="text-slate-200">{v.lancRota.motorista}</span></div>
                    <div>Saída: <span className="text-slate-200">{fmtHora(v.lancRota.hora_saida)}</span>
                      {v.lancRota.km_saida && <> · KM: <span className="text-slate-200">{Number(v.lancRota.km_saida).toLocaleString('pt-BR')}</span></>}
                    </div>
                    {v.lancRota.motivo && v.lancRota.motivo !== 'Rota' && (
                      <div className="text-cyan-400">{v.lancRota.motivo}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Em Evento */}
      {eventoList.length > 0 && (
        <section>
          <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
            <CalendarDays size={11} /> Em Evento — {eventoList.length}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {eventoList.map(v => (
              <div key={v.veiculo_id}
                className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm" translate="no">{v.cod}</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">🎉 Evento</span>
                </div>
                {v.lancHoje?.observacao && (
                  <span className="text-xs text-purple-300 italic">{v.lancHoje.observacao}</span>
                )}
                <div className="text-xs text-slate-400">
                  Data: <span className="text-slate-200">{fmtData(v.lancHoje?.data)}</span>
                  {v.lancHoje?.km_saida && <> · KM Saída: <span className="text-slate-200">{Number(v.lancHoje.km_saida).toLocaleString('pt-BR')}</span></>}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => abrirRetorno(v.lancHoje)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
                    <CheckCircle size={12} /> Confirmar Retorno
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Registrados hoje (rota normal) */}
      {registradoList.length > 0 && (
        <section>
          <p className="text-xs text-emerald-500/70 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle size={11} /> Registrados Hoje — {registradoList.length}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {registradoList.map(v => (
              <div key={v.veiculo_id}
                className="bg-slate-900/50 border border-slate-800/60 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <span className="font-bold text-slate-300 text-sm leading-none" translate="no">{v.cod}</span>
                {v.fleet_veiculos?.placa && <span className="text-xs text-slate-600 leading-none">{v.fleet_veiculos.placa}</span>}
                <span className={`text-xs leading-none ${v.lancHoje?.status === 'aprovado' ? 'text-emerald-500' : v.lancHoje?.status === 'rejeitado' ? 'text-rose-500' : 'text-amber-500'}`}>
                  {v.lancHoje?.status === 'aprovado' ? '✅ Aprovado' : v.lancHoje?.status === 'rejeitado' ? '❌ Rejeitado' : '⏳ Pendente'}
                </span>
                {v.lancHoje?.total_recorrido && (
                  <span className="text-xs text-slate-500 leading-none">+{Number(v.lancHoje.total_recorrido).toLocaleString('pt-BR')} km</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Disponíveis */}
      {disponivelList.length > 0 && (
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
            <Truck size={11} /> Disponíveis / Sem Registro — {disponivelList.length}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {disponivelList.map(v => (
              <div key={v.veiculo_id}
                className="bg-slate-900/40 border border-slate-800/40 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <span className="font-bold text-slate-400 text-sm leading-none" translate="no">{v.cod}</span>
                {v.fleet_veiculos?.placa && <span className="text-xs text-slate-600 leading-none">{v.fleet_veiculos.placa}</span>}
                <span className="text-xs text-slate-600 leading-none">
                  {v.fleet_veiculos?.km_atual ? Number(v.fleet_veiculos.km_atual).toLocaleString('pt-BR') + ' km' : 'KM —'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Em Manutenção */}
      {manutencaoList.length > 0 && (
        <section>
          <p className="text-xs text-orange-500/70 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
            <Clock size={11} /> Em Manutenção — {manutencaoList.length}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {manutencaoList.map(v => (
              <div key={v.veiculo_id}
                className="bg-orange-950/20 border border-orange-500/20 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                <span className="font-bold text-orange-300 text-sm leading-none" translate="no">{v.cod}</span>
                {v.fleet_veiculos?.placa && <span className="text-xs text-slate-500 leading-none">{v.fleet_veiculos.placa}</span>}
                <span className="text-xs text-orange-400/70 leading-none">{v.fleet_veiculos?.status_operacional}</span>
                {v.fleet_veiculos?.motivo_manutencao && (
                  <span className="text-xs text-slate-400 leading-none italic">{v.fleet_veiculos.motivo_manutencao}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="text-center text-slate-500 py-8 text-sm">Carregando...</div>
      )}
    </div>
  );
}
