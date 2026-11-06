import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function LancamentoMobile() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoControle, setTipoControle] = useState('km');

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    motorista: '',
    veiculoId: '',
    veiculoNome: '',
    inicio: '',
    fim: '',
  });

  useEffect(() => {
    async function fetchVeiculosAtivos() {
      const { data, error } = await supabase
        .from('fleet_veiculos')
        .select('id, codigo_vda, placa, tipo_veiculo, categoria')
        .in('status_operacional', ['Ativo', 'Manutenção'])
        .neq('categoria', 'Gerência')
        .order('codigo_vda');

      if (error) {
        console.error('Erro ao buscar frota:', error);
      } else if (data && data.length > 0) {
        setVeiculos(data);
        selecionarVeiculo(data[0]);
      }
    }
    fetchVeiculosAtivos();
  }, []);

  const selecionarVeiculo = (v) => {
    const isHorimetro = v.codigo_vda === 'VDA 94' || v.tipo_veiculo === 'Horímetro';
    setTipoControle(isHorimetro ? 'horimetro' : 'km');
    const label = v.codigo_vda + (v.placa ? ` - ${v.placa}` : '');
    setFormData(prev => ({ ...prev, veiculoId: v.id, veiculoNome: label }));
  };

  const handleVeiculoChange = (e) => {
    const id = e.target.value;
    const v = veiculos.find(x => String(x.id) === id);
    if (v) selecionarVeiculo(v);
  };

  const totalCalculado = formData.fim && formData.inicio
    ? Number(formData.fim) - Number(formData.inicio)
    : 0;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.motorista || !formData.inicio || !formData.fim) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    if (totalCalculado < 0) {
      alert('O valor final não pode ser menor que o valor inicial!');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        veiculo: formData.veiculoNome,
        data: formData.data,
        motorista: formData.motorista,
        tipo_controle: tipoControle,
        valor_inicial: Number(formData.inicio),
        valor_final: Number(formData.fim),
        total_recorrido: totalCalculado,
        status: 'pendente',
      };
      const { error } = await supabase.from('lancamentos_diarios').insert([payload]);
      if (error) throw error;
      alert(`✅ Lançamento gravado!\nTotal ${tipoControle === 'km' ? 'KM' : 'Horas'}: ${totalCalculado}`);
      setFormData(prev => ({ ...prev, inicio: '', fim: '' }));
    } catch (err) {
      alert('Erro ao gravar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
      <div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 shadow-lg text-center">
          <h1 className="text-lg font-bold text-blue-400">GELOCRIM — Pátio & Rotas</h1>
          <p className="text-xs text-slate-400">Registo Diário de Campo</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data</label>
            <input type="date"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
              value={formData.data}
              onChange={e => setFormData({ ...formData, data: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Motorista</label>
            <input type="text" placeholder="Nome do motorista"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
              value={formData.motorista}
              onChange={e => setFormData({ ...formData, motorista: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Veículo (VDA)</label>
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none font-medium"
              value={formData.veiculoId}
              onChange={handleVeiculoChange}>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.codigo_vda}{v.placa ? ` - ${v.placa}` : ''}{v.codigo_vda === 'VDA 94' ? ' ⏱️' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={`p-2 rounded-lg text-center text-xs font-bold ${tipoControle === 'horimetro' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
            {tipoControle === 'horimetro' ? '⏱️ Controlo por Horímetro (VDA 94)' : '🛣️ Controlo por Quilometragem (KM)'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                {tipoControle === 'km' ? 'KM Inicial' : 'Horímetro Inicial'}
              </label>
              <input type="number" placeholder={tipoControle === 'km' ? 'Ex: 229340' : 'Ex: 1786'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
                value={formData.inicio}
                onChange={e => setFormData({ ...formData, inicio: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                {tipoControle === 'km' ? 'KM Final' : 'Horímetro Final'}
              </label>
              <input type="number" placeholder={tipoControle === 'km' ? 'Ex: 229500' : 'Ex: 2334'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
                value={formData.fim}
                onChange={e => setFormData({ ...formData, fim: e.target.value })} />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex justify-between items-center">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Percorrido:</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {totalCalculado > 0 ? totalCalculado : 0} {tipoControle === 'km' ? 'km' : 'h'}
            </span>
          </div>

          <div className="pt-2 space-y-2">
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 text-sm uppercase tracking-wide">
              {loading ? 'Gravando...' : 'Lançar KM'}
            </button>
            <button type="button"
              onClick={() => setFormData(prev => ({ ...prev, inicio: '', fim: '', motorista: '' }))}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium p-2.5 rounded-xl transition-colors text-xs uppercase">
              Limpar
            </button>
          </div>
        </form>
      </div>

      <footer className="text-center text-[10px] text-slate-500 mt-6">
        GELOCRIM Logística • Supabase Sync Ativo
      </footer>
    </div>
  );
}
