import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_BADGE = {
  pendente:  { label: 'Pendente',  cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  aprovado:  { label: 'Aprovado',  cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejeitado: { label: 'Rejeitado', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
}

export default function LancamentosDiarios() {
  const today = new Date().toISOString().slice(0, 10);
  const [filtroData, setFiltroData] = useState(today);
  const [filtroStatus, setFiltroStatus] = useState('pendente');
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscar = async () => {
    setLoading(true);
    let q = supabase
      .from('lancamentos_diarios')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filtroData) q = q.eq('data', filtroData);
    if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus);

    const { data, error } = await q;
    if (error) console.error(error);
    setLancamentos(data || []);
    setLoading(false);
  };

  useEffect(() => { buscar(); }, [filtroData, filtroStatus]);

  const aprovar = async (id) => {
    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({ status: 'aprovado' })
      .eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
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

  const totalKm = lancamentos
    .filter(l => l.status === 'aprovado' && l.tipo_controle === 'km')
    .reduce((acc, l) => acc + Number(l.total_recorrido), 0);

  const pendentes = lancamentos.filter(l => l.status === 'pendente').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">KM Diário — Validação</h2>
          <p className="text-xs text-slate-400">Lançamentos enviados pelos motoristas via PWA</p>
        </div>
        <button onClick={buscar}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Tabela */}
      {loading ? (
        <div className="text-center text-slate-500 py-12 text-sm">Carregando...</div>
      ) : lancamentos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-sm">
          {filtroStatus === 'pendente'
            ? '✅ Nenhum lançamento pendente. Tudo validado!'
            : 'Nenhum lançamento encontrado para este filtro.'}
        </div>
      ) : (
        <div className="space-y-2">
          {lancamentos.map(item => {
            const sb = STATUS_BADGE[item.status] || STATUS_BADGE.pendente;
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
                    <span className="text-xs text-slate-400">📅 {item.data}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Motorista: <strong className="text-blue-300">{item.motorista}</strong>
                    <span className="ml-2 text-slate-500">|</span>
                    <span className="ml-2 uppercase font-semibold text-slate-400">{item.tipo_controle}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Início: <span className="text-slate-200">{Number(item.valor_inicial).toLocaleString('pt-BR')}</span>
                    <span className="mx-1">→</span>
                    Final: <span className="text-slate-200">{Number(item.valor_final).toLocaleString('pt-BR')}</span>
                    <span className="mx-1">|</span>
                    <strong className="text-emerald-400">
                      Total: {Number(item.total_recorrido).toLocaleString('pt-BR')} {item.tipo_controle === 'km' ? 'km' : 'h'}
                    </strong>
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
        </div>
      )}
    </div>
  );
}
