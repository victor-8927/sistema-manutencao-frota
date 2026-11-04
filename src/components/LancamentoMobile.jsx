import React, { useState, useEffect } from 'react';
import { supabase } from '../firebase';

export default function LancamentoMobile() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoControle, setTipoControle] = useState('km'); // 'km' ou 'horimetro'
  
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    motorista: '',
    veiculoId: '',
    veiculoNome: '',
    inicio: '',
    fim: '',
  });

  // 1. Buscar apenas veículos ATIVOS no Supabase para preservar o histórico dos vendidos
  useEffect(() => {
    async function fetchVeiculosAtivos() {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('status', 'Ativo'); // Filtra apenas frota ativa

      if (error) {
        console.error('Erro ao buscar frota ativa:', error);
      } else if (data && data.length > 0) {
        setVeiculos(data);
        // Define o primeiro veículo por defeito
        selecionarVeiculoInicial(data[0]);
      }
    }
    fetchVeiculosAtivos();
  }, []);

  const selecionarVeiculoInicial = (v) => {
    const nomeFormatado = v.codigo ? `${v.codigo} ${v.placa && v.placa !== '—' ? `- ${v.placa}` : ''}` : v.placa;
    
    // Regra de Ouro: VDA 94 usa horímetro, os restantes usam KM
    const isHorimetro = v.codigo === 'VDA 94' || v.tipo === 'Horímetro';
    
    setTipoControle(isHorimetro ? 'horimetro' : 'km');
    setFormData(prev => ({
      ...prev,
      veiculoId: v.id || v.codigo,
      veiculoNome: nomeFormatado
    }));
  };

  const handleVeiculoChange = (e) => {
    const codigoSelecionado = e.target.value;
    const veiculoObj = veiculos.find(v => {
      const label = v.codigo ? `${v.codigo} ${v.placa && v.placa !== '—' ? `- ${v.placa}` : ''}` : v.placa;
      return label === codigoSelecionado;
    });

    if (veiculoObj) {
      selecionarVeiculoInicial(veiculoObj);
    }
  };

  // Cálculo dinâmico do total percorrido ou horas trabalhadas
  const totalCalculado = formData.fim && formData.inicio 
    ? Number(formData.fim) - Number(formData.inicio) 
    : 0;

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.motorista || !formData.inicio || !formData.fim) {
      alert('Por favor, preencha todos os campos obrigatórios.');
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
        tipo_controle: tipoControle, // 'km' ou 'horimetro'
        valor_inicial: Number(formData.inicio),
        valor_final: Number(formData.fim),
        total_recorrido: totalCalculado
      };

      const { error } = await supabase
        .from('lancamentos_diarios')
        .insert([payload]);

      if (error) throw error;

      alert(`✅ Lançamento gravado com sucesso!\nTotal ${tipoControle === 'km' ? 'KM' : 'Horas'}: ${totalCalculado}`);

      // Limpar campos de leitura mantendo data, motorista e veículo
      setFormData(prev => ({
        ...prev,
        inicio: '',
        fim: ''
      }));

    } catch (error) {
      console.error('Erro ao gravar no Supabase:', error.message);
      alert('Erro ao gravar lançamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between">
      <div>
        {/* Cabeçalho Mobile */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-4 shadow-lg text-center">
          <h1 className="text-lg font-bold text-blue-400">GELOCRIM - Pátio & Rotas</h1>
          <p className="text-xs text-slate-400">Registo Diário de Campo (PWA)</p>
        </div>

        {/* Formulário Operacional */}
        <form onSubmit={handleSave} className="space-y-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
          
          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Data</label>
            <input 
              type="date"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
              value={formData.data}
              onChange={(e) => setFormData({...formData, data: e.target.value})}
            />
          </div>

          {/* Motorista */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Motorista</label>
            <input 
              type="text"
              placeholder="Nome do motorista (ex: Maicon)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
              value={formData.motorista}
              onChange={(e) => setFormData({...formData, motorista: e.target.value})}
            />
          </div>

          {/* Veículo (VDA / Placa) - Dinâmico */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Veículo (VDA)</label>
            <select 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none font-medium"
              value={formData.veiculoNome}
              onChange={handleVeiculoChange}
            >
              {veiculos.map((v, index) => {
                const label = v.codigo ? `${v.codigo} ${v.placa && v.placa !== '—' ? `- ${v.placa}` : ''}` : v.placa;
                return (
                  <option key={index} value={label}>
                    {label} {v.codigo === 'VDA 94' ? '⏱️ (Horímetro)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Badge de Indicador do Tipo de Controlo */}
          <div className={`p-2 rounded-lg text-center text-xs font-bold ${tipoControle === 'horimetro' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
            {tipoControle === 'horimetro' ? '⏱️ Controlo por Horímetro de Motor (VDA 94)' : '🛣️ Controlo por Quilometragem (KM)'}
          </div>

          {/* Leituras Dinâmicas (Inicial e Final) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                {tipoControle === 'km' ? 'KM Inicial' : 'Horímetro Inicial'}
              </label>
              <input 
                type="number"
                placeholder={tipoControle === 'km' ? 'Ex: 229340' : 'Ex: 1786'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
                value={formData.inicio}
                onChange={(e) => setFormData({...formData, inicio: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                {tipoControle === 'km' ? 'KM Final' : 'Horímetro Final'}
              </label>
              <input 
                type="number"
                placeholder={tipoControle === 'km' ? 'Ex: 229500' : 'Ex: 2334'}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 text-sm focus:border-blue-500 focus:outline-none"
                value={formData.fim}
                onChange={(e) => setFormData({...formData, fim: e.target.value})}
              />
            </div>
          </div>

          {/* Total Recorrido / Horas Trabalhadas em Tempo Real */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex justify-between items-center">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Recorrido:</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {totalCalculado > 0 ? totalCalculado : 0} {tipoControle === 'km' ? 'km' : 'horas'}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 space-y-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 text-sm uppercase tracking-wide"
            >
              {loading ? 'A gravar na nuvem...' : 'Validar Lançamento'}
            </button>

            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, inicio: '', fim: '', motorista: '' }))}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium p-2.5 rounded-xl transition-colors text-xs uppercase"
            >
              Encerrar / Limpar KM
            </button>
          </div>

        </form>
      </div>

      <footer className="text-center text-[10px] text-slate-500 mt-6">
        GELOCRIM Logística & Automática • Supabase Sync Ativo
      </footer>
    </div>
  );
}