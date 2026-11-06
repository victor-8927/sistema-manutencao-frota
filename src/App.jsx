import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Veiculos from './components/Veiculos';
import Manutencoes from './components/Manutencoes';
import ControleOleo from './components/ControleOleo';
import Tacografo from './components/Tacografo';
import LancamentosDiarios from './components/LancamentosDiarios';
import StatusDiarioFlyer from './components/StatusDiarioFlyer';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  // Permite que Veiculos.jsx navegue para o flyer via evento customizado
  useEffect(() => {
    const handler = () => setAbaAtiva('status-diario');
    window.addEventListener('nav:status-diario', handler);
    return () => window.removeEventListener('nav:status-diario', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra Superior Executiva - Otimizada para Monitores de 32" com Logótipo Oficial */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex flex-wrap justify-between items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Logótipo Oficial GeloCrim */}
          <div className="bg-white/5 border border-slate-700/60 p-2 rounded-xl flex items-center justify-center shadow-inner">
            <img 
              src="/gelocrim-logo.png" 
              alt="GeloCrim" 
              className="h-9 w-auto object-contain" 
              onError={(e) => {
                // Fallback automático caso o ficheiro de imagem ainda não esteja na pasta public
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback Visual caso a imagem demore ou falte */}
            <div className="hidden bg-gradient-to-tr from-blue-700 to-cyan-500 text-white font-black px-3 py-1.5 rounded-lg text-sm tracking-widest">
              GC
            </div>
          </div>

          <div>
            <h1 className="font-black text-white text-lg tracking-wide flex items-center gap-2">
              Sistema de Manutenção de Frotas <span className="text-cyan-400 font-extrabold">GeloCrim</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Painel Operacional e Gestão de Frotas de Distribuição</p>
          </div>
        </div>

        <nav className="flex items-center gap-2.5">
          <button 
            onClick={() => setAbaAtiva('dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow-blue-600/40 ring-1 ring-blue-400/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            📊 Painel de Controlo
          </button>

          <button 
            onClick={() => setAbaAtiva('veiculos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${abaAtiva === 'veiculos' ? 'bg-blue-600 text-white shadow-blue-600/40 ring-1 ring-blue-400/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🚚 Carros / Veículos
          </button>

          <button 
            onClick={() => setAbaAtiva('manutencoes')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${abaAtiva === 'manutencoes' ? 'bg-blue-600 text-white shadow-blue-600/40 ring-1 ring-blue-400/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🔧 Manutenção
          </button>

          <button 
            onClick={() => setAbaAtiva('oleo')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${abaAtiva === 'oleo' ? 'bg-blue-600 text-white shadow-blue-600/40 ring-1 ring-blue-400/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            🛢️ Óleo
          </button>

          <button 
            onClick={() => setAbaAtiva('tacografo')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${abaAtiva === 'tacografo' ? 'bg-blue-600 text-white shadow-blue-600/40 ring-1 ring-blue-400/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            ⏱️ Tacógrafos
          </button>

          <button
            onClick={() => setAbaAtiva('lancamentos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm border border-amber-500/40 ${abaAtiva === 'lancamentos' ? 'bg-amber-600 text-white shadow-amber-600/40 ring-1 ring-amber-400/30' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'}`}
          >
            📍 KM Diário
          </button>

          <button
            onClick={() => setAbaAtiva('status-diario')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm border border-emerald-500/40 ${abaAtiva === 'status-diario' ? 'bg-emerald-600 text-white shadow-emerald-600/40 ring-1 ring-emerald-400/30' : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'}`}
          >
            📋 Status da Frota
          </button>
        </nav>
      </header>

      {/* Conteúdo Ativo */}
      <main className="flex-1 p-6">
        {abaAtiva === 'dashboard' && <Dashboard />}
        {abaAtiva === 'veiculos' && <Veiculos />}
        {abaAtiva === 'manutencoes' && <Manutencoes />}
        {abaAtiva === 'oleo' && <ControleOleo />}
        {abaAtiva === 'tacografo' && <Tacografo />}
        {abaAtiva === 'lancamentos' && <LancamentosDiarios />}
        {abaAtiva === 'status-diario' && <StatusDiarioFlyer />}
      </main>
    </div>
  );
}