import React, { useState, useEffect } from 'react';
import { supabase } from '../firebase'; // Ajusta o caminho do supabase se necessário

export default function LancamentosDiarios() {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscarPendentes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lancamentos_diarios')
      .select('*')
      .eq('status', 'pendente')
      .order('data', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lançamentos pendentes:', error);
    } else {
      setPendentes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarPendentes();
  }, []);

  const aprovarLancamento = async (id) => {
    const { error } = await supabase
      .from('lancamentos_diarios')
      .update({ status: 'aprovado' })
      .eq('id', id);

    if (error) {
      alert('Erro ao aprovar lançamento: ' + error.message);
    } else {
      alert('✅ Lançamento aprovado com sucesso!');
      buscarPendentes();
    }
  };

  const rejeitarLancamento = async (id) => {
    if (!window.confirm('Tens a certeza que queres rejeitar e eliminar este registo?')) return;

    const { error } = await supabase
      .from('lancamentos_diarios')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao rejeitar: ' + error.message);
    } else {
      alert('🗑️ Lançamento rejeitado e removido.');
      buscarPendentes();
    }
  };

  return (
    <div className="p-4 bg-slate-950 text-slate-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-base font-bold text-blue-400">Validação de Lançamentos de Campo (PWA)</h1>
            <p className="text-[11px] text-slate-400">Analise e aprove os registos enviados pelos motoristas via telemóvel.</p>
          </div>
          <button 
            onClick={buscarPendentes}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
          >
            🔄 Atualizar Fila
          </button>
        </div>

        {loading ? (
          <p className="text-center text-slate-500 py-12 text-xs">A carregar lançamentos pendentes...</p>
        ) : pendentes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center text-slate-400 text-xs">
            ✅ Não há lançamentos pendentes de aprovação no momento. Todos os registos do campo foram validados.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendentes.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{item.veiculo}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-medium">Pendente de Aprovação</span>
                    <span className="text-[11px] text-slate-400">📅 {item.data}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Motorista: <strong className="text-blue-300">{item.motorista}</strong> | 
                    Controlo: <span className="uppercase font-semibold text-slate-200">{item.tipo_controle}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Início: {item.valor_inicial} | Final: {item.valor_final} | 
                    <strong className="text-emerald-400 ml-1">Total: {item.total_recorrido} {item.tipo_controle === 'km' ? 'km' : 'horas'}</strong>
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => aprovarLancamento(item.id)}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded text-xs transition-colors shadow"
                  >
                    ✔️ Aprovar
                  </button>
                  <button 
                    onClick={() => rejeitarLancamento(item.id)}
                    className="flex-1 md:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white px-3 py-1.5 rounded text-xs border border-rose-500/30 transition-colors"
                  >
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}