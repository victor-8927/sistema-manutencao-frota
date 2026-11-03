import React, { useState } from 'react'
import { Truck, Droplets, Radio, Wrench, LayoutDashboard } from 'lucide-react'
import Dashboard from './components/Dashboard'
import ControleOleo from './components/ControleOleo'
import Tacografo from './components/Tacografo'
import Manutencoes from './components/Manutencoes'
import Veiculos from './components/Veiculos'

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'veiculos',    label: 'Veículos',        icon: Truck },
  { id: 'oleo',        label: 'Troca de Óleo',   icon: Droplets },
  { id: 'tacografo',   label: 'Tacógrafo',       icon: Radio },
  { id: 'manutencoes', label: 'Manutenções',      icon: Wrench },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">GELOCRIM</h1>
              <p className="text-xs text-gray-500 leading-none mt-0.5">Sistema de Manutenção de Frota</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 ${
                  tab === id
                    ? 'text-blue-400 border-blue-500 bg-gray-800/50'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'dashboard'   && <Dashboard />}
        {tab === 'veiculos'    && <Veiculos />}
        {tab === 'oleo'        && <ControleOleo />}
        {tab === 'tacografo'   && <Tacografo />}
        {tab === 'manutencoes' && <Manutencoes />}
      </main>
    </div>
  )
}
