import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Veiculos from './components/Veiculos';
import Manutencoes from './components/Manutencoes';
import ControleOleo from './components/ControleOleo';
import Tacografo from './components/Tacografo';
import LancamentosDiarios from './components/LancamentosDiarios';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegação Superior / Menu Completo */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-400 text-sm">GELOCRIM OPS</span>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400">Sistema de Gestão de Frotas</span>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5">
          <button 
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            📊 Dashboard
          </button>

          <button 
            onClick={() => setAbaAtiva('veiculos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${abaAtiva === 'veiculos' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🚚 Carros / Veículos
          </button>

          <button 
            onClick={() => setAbaAtiva('manutencoes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${abaAtiva === 'manutencoes' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🔧 Manutenção
          </button>

          <button 
            onClick={() => setAbaAtiva('oleo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${abaAtiva === 'oleo' ? 'bg-oleo' : ''} ${abaAtiva === 'oleo' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🛢️ Óleo
          </button>

          <button 
            onClick={() => setAbaAtiva('tacografo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${abaAtiva === 'tacografo' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            ⏱️ Tacógrafos
          </button>

          <button 
            onClick={() => setAbaAtiva('lancamentos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-amber-500/30 ${abaAtiva === 'lancamentos' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'}`}
          >
            📥 Validação PWA
          </button>
        </nav>
      </header>

      {/* Renderização da Aba Ativa */}
      <main className="flex-1 p-4">
        {abaAtiva === 'dashboard' && <Dashboard />}
        {abaAtiva === 'veiculos' && <Veiculos />}
        {abaAtiva === 'manutencoes' && <Manutencoes />}
        {abaAtiva === 'oleo' && <ControleOleo />}
        {abaAtiva === 'tacografo' && <Tacografo />}
        {abaAtiva === 'lancamentos' && <LancamentosDiarios />}
      </main>
    </div>
  );
}