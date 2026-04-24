import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Removed StrictMode for production stability with Konva events
createRoot(document.getElementById('root')!).render(
  <App />
)
