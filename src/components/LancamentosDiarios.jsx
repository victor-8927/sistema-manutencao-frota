import React, { useState } from 'react';

export default function LancamentosDiarios() {
  const [formData, setFormData] = useState({
    veiculo: 'VDA 01',
    data: new Date().toISOString().split('T')[0],
    kmSaida: '',
    kmRetorno: '',
    motorista: ''
  });

  const handleSave = (e) => {
    e.preventDefault();
    const kmRodado = Number(formData.kmRetorno) - Number(formData.kmSaida);
    console.log("Salvando lançamento...", { ...formData, kmRodado });
    alert(`Lançamento guardado com sucesso! KM Rodado: ${kmRodado} km`);
    // Aqui depois integramos a chamada direta para a sua tabela no Supabase
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen rounded-xl border border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-blue-400">Novo Lançamento Diário de Pátio</h2>
      
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Veículo (VDA)</label>
          <select 
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.veiculo}
            onChange={(e) => setFormData({...formData, veiculo: e.target.value})}
          >
            <option value="VDA 01">VDA 01 (NOU-8H02)</option>
            <option value="VDA 20">VDA 20 (PHI-6F40)</option>
            <option value="VDA 81">VDA 81 (OAL-8193)</option>
            <option value="VDA 94">VDA 94</option>
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
            placeholder="Ex: 224917"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            value={formData.kmSaida}
            onChange={(e) => setFormData({...formData, kmSaida: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">KM de Retorno</label>
          <input 
            type="number" 
            placeholder="Ex: 225018"
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
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded transition-colors shadow-lg"
          >
            Gravar Lançamento
          </button>
        </div>
      </form>
    </div>
  );
}