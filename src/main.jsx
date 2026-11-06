import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LancamentoMobile from './components/LancamentoMobile.jsx'

const isPWA = window.location.pathname.startsWith('/pwa')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPWA ? <LancamentoMobile /> : <App />}
  </StrictMode>,
)
