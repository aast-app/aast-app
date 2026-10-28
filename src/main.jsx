import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './styles/index.scss'
import App from './App.jsx'

document.documentElement.dataset.theme = localStorage.getItem('cept_theme') === 'light' ? 'light' : 'dark';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
