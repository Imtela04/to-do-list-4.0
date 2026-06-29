import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@/styles/index.css'
import App from '@/App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

  window.addEventListener('beforeinstallprompt', () => {
  console.log('✅ beforeinstallprompt fired');
});

console.log('PWA check:', {
  isSecureContext: window.isSecureContext,
  serviceWorker: 'serviceWorker' in navigator,
  manifestLink: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
});

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)