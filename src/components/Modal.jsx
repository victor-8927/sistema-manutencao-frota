import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
