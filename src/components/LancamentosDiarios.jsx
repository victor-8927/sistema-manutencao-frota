import React, { useState, useEffect } from 'react';
import { supabase } from '../firebase';

export default function LancamentosDiarios() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    veiculo: '',
    data: new Date().toISOString().split('T')[0],
    kmSaida: '',
    kmRetorno: '',
    motorista: ''
  });

  // Buscar todos os veículos reais diretamente da base de dados do Supabase
  useEffect(() => {
    async function fetchVeiculos() {
      const { data, error } = await supabase.from('veiculos').select('*');
      if (error) {
        console.error('Erro ao buscar veículos:', error);
      } else if (data && data.length > 0) {
        setVeiculos(data);
        // Define o primeiro veículo por defeito
        const primeiro = data[0];
        setFormData(prev => ({ 
          ...prev, 
          veiculo: primeiro.codigo ? `${primeiro.codigo} ${primeiro.placa && primeiro.placa !== '—' ? `- ${primeiro.placa}` : ''}` : primeiro.placa 
        }));
      }
    }
    fetchVeiculos();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.kmSaida || !formData.kmRetorno) {
      alert('Por favor, preencha o KM de Saída e o KM de Retorno.');
      return;
    }

    const kmRodado = Number(formData.kmRetorno) - Number(formData.kmSaida);
    
    if (kmRodado < 0) {
      alert('O KM de Retorno não pode ser menor que o KM de Saída.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('lancamentos_diarios')
        .insert([
          {
            veiculo: formData.veiculo,
            data: formData.data,
            km_saida: Number(formData.kmSaida),
            km_retorno: Number(formData.kmRetorno),
            km_rodado: kmRodado,
            motorista: formData.motorista
          }
        ]);

      if (error) throw error;

      alert(`Lançamento guardado com sucesso! KM Rodado: ${kmRodado} km`);
      
      setFormData(prev => ({
        ...prev,
        kmSaida: '',
        kmRetorno: '',
        motorista: ''
      }));

    } catch (error) {
      console.error('Erro ao guardar lançamento:', error.message);
      alert('Erro ao guardar lançamento no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-blue-400">Novo Lançamento Diário de Pátio</h2>
      
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Veículo (VDA / Placa)</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.veiculo}
            onChange={(e) => setFormData({...formData, veiculo: e.target.value})}
          >
            {veiculos.map((v, index) => {
              const label = v.codigo 
                ? `${v.codigo} ${v.placa && v.placa !== '—' ? `- ${v.placa}` : ''}` 
                : v.placa;
              return (
                <option key={index} value={label}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Data</label>
          <input 
            type="date" 
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.data}
            onChange={(e) => setFormData({...formData, data: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">KM de Saída</label>
          <input 
            type="number" 
            placeholder="Ex: 229340"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.kmSaida}
            onChange={(e) => setFormData({...formData, kmSaida: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">KM de Retorno</label>
          <input 
            type="number" 
            placeholder="Ex: 229500"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.kmRetorno}
            onChange={(e) => setFormData({...formData, kmRetorno: e.target.value})}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1 text-slate-300">Motorista</label>
          <input 
            type="text" 
            placeholder="Nome do motorista (ex: Maicon)"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.motorista}
            onChange={(e) => setFormData({...formData, motorista: e.target.value})}
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? 'A gravar...' : 'Gravar Lançamento'}
          </button>
        </div>
      </form>
    </div>
  );
}