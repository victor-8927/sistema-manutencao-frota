import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Navigation, Minus, Plus, Wrench, CalendarDays, Truck, PencilLine } from 'lucide-react';

const STATUS_BADGE = {
  pendente:        { label: 'Pendente',        cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  aprovado:        { label: 'Aprovado',        cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejeitado:       { label: 'Rejeitado',       cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ajustado:        { label: '✏️ Ajustado',      cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  em_rota:         { label: 'Em Rota',         cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  sem_registro:    { label: 'Sem Registro',    cls: 'bg-slate-700/50 text-slate-400 border-slate-600/50' },
};

const TIPO_BADGE = {
  rota:            { label: 'Rota',            cls: 'bg-slate-700/50 text-slate-400 border-slate-600/30' },
  evento:          { label: '🎉 Evento',        cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  servico_externo: { label: '🔄 Serv. Externo', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  manutencao:      { label: '🔧 Manutenção',    cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  sem_movimento:   { label: '⏸ Sem Movimento',  cls: 'bg-slate-700/30 text-slate-500 border-slate-700/30' },
};

const TIPO_OPTIONS = [
  { value: 'rota',            label: 'Rota Normal' },
  { value: 'evento',          label: 'Evento da Cidade' },
  { value: 'servico_externo', label: 'Serviço Externo' },
  { value: 'manutencao',      label: 'Manutenção' },
  { value: 'sem_movimento',   label: 'Sem Movimento' },
];

function fmtHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const MODAL_VAZIO = { veiculo: '', tipo: 'rota', km_saida: '', km_retorno: '', observacao: '', data: new Date().toISOString().slice(0, 10) };

const MODAL_AJUSTE_VAZIO = { id: null, veiculo: '', km_saida: '', km_retorno: '', observacao: '' };

export default function LancamentosDiarios() {
  const today = new Date().toISOString().slice(0, 10);
  const [filtroData, setFiltroData] = useState(today);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [lancamentos, setLancamentos] = useState([]);
  const [emRota, setEmRota] = useState([]);
  const [veiculosFrota, setVeiculosFrota] = useState([]);
  const [emManutencao, setEmManutencao] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoLanc, setNovoLanc] = useState(MODAL_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(MODAL_AJUSTE_VAZIO);
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);

  const buscar = async () => {
    setLoading(true);

    // Veículos em rota (sem filtro de data)
    const { data: rota } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('status', 'em_rota')
      .order('hora_saida', { ascending: false });
    setEmRota(rota || []);

    // Frota operacional (fonte: fleet_controle_oleo)
    const { data: frota } = await supabase
      .from('fleet_controle_oleo')
      .select('veiculo_id, fleet_veiculos(id, codigo_vda, placa, km_atual, status_operacional, motivo_manutencao)');
    setVeiculosFrota(frota || []);

    // Veículos em manutenção — só os da frota operacional (fleet_controle_oleo)
    const { data: manutRaw } = await supabase
      .from('fleet_controle_oleo')
      .select('veiculo_id, fleet_veiculos(id, codigo_vda, placa, km_atual, status_operacional, motivo_manutencao, observacao_manutencao)')
      .neq('fleet_veiculos.status_operacional', 'Ativo');
    const manut = (manutRaw || [])
      .map(r => r.fleet_veiculos)
      .filter(v => v && v.status_operacional && v.status_operacional !== 'Ativo');
    setEmManutencao(manut);

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
    // FIX race condition: busca dados frescos do banco antes de aprovar
    const { data: lancFresh, error: errFetch } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('id', id)
      .single();
    if (errFetch || !lancFresh) { alert('Erro ao buscar lançamento: ' + (errFetch?.message || 'não encontrado')); return; }

    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({ status: 'aprovado' })
      .eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }

    // Atualiza km_atual apenas se tem km_retorno e não é manutenção/sem_movimento
    if (lancFresh.km_retorno && lancFresh.veiculo && lancFresh.tipo !== 'manutencao' && lancFresh.tipo !== 'sem_movimento') {
      const { data: vei } = await supabase
        .from('fleet_veiculos')
        .select('id')
        .eq('codigo_vda', lancFresh.veiculo)
        .single();
      if (vei?.id) {
        await supabase
          .from('fleet_veiculos')
          .update({ km_atual: lancFresh.km_retorno, km_atualizado_em: new Date().toISOString() })
          .eq('id', vei.id);
        await supabase
          .from('fleet_controle_oleo')
          .update({ km_atual: lancFresh.km_retorno, data_atualizacao: new Date().toISOString() })
          .eq('veiculo_id', vei.id);
      }
    }
    buscar();
  };

  const salvarLancamentoManual = async () => {
    if (!novoLanc.veiculo) { alert('Selecione o veículo.'); return; }
    if (!novoLanc.data) { alert('Informe a data.'); return; }
    setSalvando(true);

    const payload = {
      veiculo: novoLanc.veiculo,
      tipo: novoLanc.tipo,
      data: novoLanc.data,
      status: 'pendente',
      motorista: 'Lançamento Manual',
      observacao: novoLanc.observacao || null,
      km_saida: novoLanc.km_saida ? Number(novoLanc.km_saida) : null,
      km_retorno: novoLanc.km_retorno ? Number(novoLanc.km_retorno) : null,
      total_recorrido: (novoLanc.km_saida && novoLanc.km_retorno)
        ? Number(novoLanc.km_retorno) - Number(novoLanc.km_saida)
        : null,
    };

    const { error } = await supabase.from('lancamentos_diarios').insert([payload]);
    setSalvando(false);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    setModalAberto(false);
    setNovoLanc(MODAL_VAZIO);
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

  const abrirAjuste = (item) => {
    setModalAjuste({
      id: item.id,
      veiculo: item.veiculo,
      km_saida: item.km_saida || '',
      km_retorno: item.km_retorno || '',
      observacao: item.observacao || '',
    });
  };

  const salvarAjuste = async () => {
    if (!modalAjuste.id) return;
    setSalvandoAjuste(true);
    const kmSaida = modalAjuste.km_saida ? Number(modalAjuste.km_saida) : null;
    const kmRetorno = modalAjuste.km_retorno ? Number(modalAjuste.km_retorno) : null;
    const totalRecorrido = kmSaida && kmRetorno ? kmRetorno - kmSaida : null;

    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({
        status: 'ajustado',
        km_saida: kmSaida,
        km_retorno: kmRetorno,
        total_recorrido: totalRecorrido,
        observacao: modalAjuste.observacao || null,
      })
      .eq('id', modalAjuste.id);

    setSalvandoAjuste(false);
    if (error) { alert('Erro ao ajustar: ' + error.message); return; }

    // Atualiza km_atual no veículo se tem km_retorno
    if (kmRetorno && modalAjuste.veiculo) {
      const { data: vei } = await supabase
        .from('fleet_veiculos')
        .select('id')
        .eq('codigo_vda', modalAjuste.veiculo)
        .single();
      if (vei?.id) {
        await supabase.from('fleet_veiculos')
          .update({ km_atual: kmRetorno, km_atualizado_em: new Date().toISOString() })
          .eq('id', vei.id);
        await supabase.from('fleet_controle_oleo')
          .update({ km_atual: kmRetorno, data_atualizacao: new Date().toISOString() })
          .eq('veiculo_id', vei.id);
      }
    }

    setModalAjuste(MODAL_AJUSTE_VAZIO);
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

  // FIX totalKm: filtra pela data selecionada
  const totalKm = lancamentos
    .filter(l => l.status === 'aprovado' && (!filtroData || l.data === filtroData))
    .reduce((acc, l) => acc + Number(l.total_recorrido || 0), 0);

  const pendentes = lancamentos.filter(l => l.status === 'pendente').length;
  const totalFrota = veiculosFrota.length;
  const comRegistro = lancamentos.length + emRota.length;

  return (
    <div className="space-y-4">

      {/* Modal Ajuste de Lançamento Rejeitado */}
      {modalAjuste.id && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PencilLine size={16} className="text-cyan-400" /> Ajustar Lançamento
              </h3>
              <button onClick={() => setModalAjuste(MODAL_AJUSTE_VAZIO)}
                className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-slate-400">Veículo: <strong className="text-white">{modalAjuste.veiculo}</strong> — após salvar o status ficará <span className="text-cyan-300 font-semibold">Ajustado</span> e o KM atual será atualizado.</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">KM Saída</label>
                  <input type="number" value={modalAjuste.km_saida}
                    onChange={e => setModalAjuste(p => ({ ...p, km_saida: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">KM Retorno</label>
                  <input type="number" value={modalAjuste.km_retorno}
                    onChange={e => setModalAjuste(p => ({ ...p, km_retorno: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Observação do ajuste</label>
                <input type="text" value={modalAjuste.observacao}
                  onChange={e => setModalAjuste(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="ex: KM corrigido pelo assistente"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={salvarAjuste} disabled={salvandoAjuste}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {salvandoAjuste ? 'Salvando...' : '✏️ Salvar Ajuste'}
              </button>
              <button onClick={() => setModalAjuste(MODAL_AJUSTE_VAZIO)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lançamento Manual */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-blue-400" /> Lançamento Manual
              </h3>
              <button onClick={() => { setModalAberto(false); setNovoLanc(MODAL_VAZIO); }}
                className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Veículo *</label>
                <select value={novoLanc.veiculo}
                  onChange={e => setNovoLanc(p => ({ ...p, veiculo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="">Selecione...</option>
                  {veiculosFrota.map(f => (
                    <option key={f.veiculo_id} value={f.fleet_veiculos?.codigo_vda}>
                      {f.fleet_veiculos?.codigo_vda} {f.fleet_veiculos?.placa ? `· ${f.fleet_veiculos.placa}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tipo *</label>
                <select value={novoLanc.tipo}
                  onChange={e => setNovoLanc(p => ({ ...p, tipo: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                  {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Data *</label>
                <input type="date" value={novoLanc.data}
                  onChange={e => setNovoLanc(p => ({ ...p, data: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>

              {novoLanc.tipo !== 'manutencao' && novoLanc.tipo !== 'sem_movimento' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">KM Saída</label>
                    <input type="number" value={novoLanc.km_saida}
                      onChange={e => setNovoLanc(p => ({ ...p, km_saida: e.target.value }))}
                      placeholder="ex: 325000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">KM Retorno</label>
                    <input type="number" value={novoLanc.km_retorno}
                      onChange={e => setNovoLanc(p => ({ ...p, km_retorno: e.target.value }))}
                      placeholder="ex: 325867"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Observação</label>
                <input type="text" value={novoLanc.observacao}
                  onChange={e => setNovoLanc(p => ({ ...p, observacao: e.target.value }))}
                  placeholder={novoLanc.tipo === 'evento' ? 'ex: Carnaval 2026 — Sambódromo' : novoLanc.tipo === 'manutencao' ? 'ex: Troca de freios' : ''}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={salvarLancamentoManual} disabled={salvando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {salvando ? 'Salvando...' : 'Salvar → Pendente'}
              </button>
              <button onClick={() => { setModalAberto(false); setNovoLanc(MODAL_VAZIO); }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">KM Diário — Validação</h2>
          <p className="text-xs text-slate-400">
            Status da frota operacional · {comRegistro}/{totalFrota} veículos com registro
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={13} /> Lançamento Manual
          </button>
          <button onClick={buscar}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
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
            <option value="ajustado">Ajustados</option>
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
                    {item.tipo && item.tipo !== 'rota' && (
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${(TIPO_BADGE[item.tipo] || TIPO_BADGE.rota).cls}`}>
                        {(TIPO_BADGE[item.tipo] || TIPO_BADGE.rota).label}
                      </span>
                    )}
                    {item.motivo && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.motivo}
                      </span>
                    )}
                    {item.observacao && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700/50 italic">
                        {item.observacao}
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

                {item.status === 'rejeitado' && (
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <button onClick={() => abrirAjuste(item)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-4 py-2 rounded-lg text-xs border border-cyan-500/30 transition-colors">
                      <PencilLine size={13} /> Editar + Ajustar
                    </button>
                  </div>
                )}

                {(item.status === 'aprovado' || item.status === 'ajustado') && (
                  <div className="shrink-0">
                    <CheckCircle size={20} className={item.status === 'ajustado' ? 'text-cyan-400' : 'text-emerald-400'} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Veículos SEM registro — KM vigente do último lançamento */}
          {semRegistro.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1 mt-1 flex items-center gap-1.5">
                <Minus size={11} /> Parados / KM Mantido — {semRegistro.length} veículo{semRegistro.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-slate-600 mb-2">KM carregado do último lançamento aprovado — não saíram hoje</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {semRegistro.map(item => (
                  <div key={`sr-${item.veiculo}`}
                    className="bg-slate-900/50 border border-slate-800/60 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-300 text-sm leading-none" translate="no">{item.veiculo}</span>
                      <span className="text-xs text-slate-600 border border-slate-700/50 px-1 rounded leading-none">=</span>
                    </div>
                    {item.placa && (
                      <span className="text-xs text-slate-600 leading-none">{item.placa}</span>
                    )}
                    {item.km_atual ? (
                      <span className="text-xs text-slate-300 leading-none font-medium">
                        🛣 {Number(item.km_atual).toLocaleString('pt-BR')} km
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 leading-none">KM —</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Veículos EM MANUTENÇÃO */}
          {emManutencao.length > 0 && (filtroStatus === 'todos') && (
            <div>
              <p className="text-xs text-orange-500/70 uppercase tracking-widest font-semibold mb-2 mt-1 flex items-center gap-1.5">
                <Wrench size={11} /> Em Manutenção — {emManutencao.length} veículo{emManutencao.length > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {emManutencao.map(v => (
                  <div key={`manut-${v.id}`}
                    className="bg-orange-950/20 border border-orange-500/20 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-orange-300 text-sm leading-none" translate="no">{v.codigo_vda}</span>
                      <Wrench size={11} className="text-orange-500/60 shrink-0" />
                    </div>
                    {v.placa && <span className="text-xs text-slate-500 leading-none">{v.placa}</span>}
                    <span className="text-xs text-orange-400/70 leading-none">{v.status_operacional}</span>
                    {v.motivo_manutencao && (
                      <span className="text-xs text-slate-400 leading-none italic">{v.motivo_manutencao}</span>
                    )}
                    <span className="text-xs text-slate-600 leading-none">
                      {v.km_atual ? Number(v.km_atual).toLocaleString('pt-BR') + ' km' : 'KM —'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
