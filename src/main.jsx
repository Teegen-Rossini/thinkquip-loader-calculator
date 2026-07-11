import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installDesktopBridge } from './lib/desktopBridge'

// In the Tauri desktop shell this installs window.thinkquipDesktop, which turns
// the "Save ThinkQuip Copy" button into a silent write to the salesman's folder.
// In a plain browser it is a no-op and the existing browser fallback is used.
installDesktopBridge()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
