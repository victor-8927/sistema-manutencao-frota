import React from 'react';
import PainelAnalista from '../components/PainelAnalista';

export default function AnalistaPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/5 border border-slate-700/60 p-2 rounded-xl flex items-center justify-center shadow-inner">
            <img
              src="/gelocrim-logo.png"
              alt="GeloCrim"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden bg-gradient-to-tr from-blue-700 to-cyan-500 text-white font-black px-3 py-1.5 rounded-lg text-sm tracking-widest">
              GC
            </div>
          </div>
          <div>
            <h1 className="font-black text-white text-base tracking-wide flex items-center gap-2">
              Painel do Analista <span className="text-purple-400 font-extrabold">GELOCRIM</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">Distribuição · Controle em tempo real</p>
          </div>
        </div>
        <span className="text-xs text-slate-600 select-none">analista.gelocrim</span>
      </header>

      <main className="flex-1 p-6">
        <PainelAnalista />
      </main>
    </div>
  );
}
