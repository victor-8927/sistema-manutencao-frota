import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <p className="text-sm text-gray-200">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
