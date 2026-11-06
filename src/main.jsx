import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LancamentoMobile from './components/LancamentoMobile.jsx'
import AnalistaPage from './pages/AnalistaPage.jsx'

const path = window.location.pathname

let RootComponent = App
if (path.startsWith('/pwa')) RootComponent = LancamentoMobile
else if (path.startsWith('/analista')) RootComponent = AnalistaPage

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
)
