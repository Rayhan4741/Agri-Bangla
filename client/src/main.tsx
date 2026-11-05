import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
// Self-hosted fonts (bundled → work offline, no third-party font requests)
import '@fontsource/hind-siliguri/bengali-400.css';
import '@fontsource/hind-siliguri/bengali-500.css';
import '@fontsource/hind-siliguri/bengali-600.css';
import '@fontsource/hind-siliguri/bengali-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: register the service worker only for the normal production build
// served over http(s). The single-file preview build and dev server skip it.
if (import.meta.env.PROD && import.meta.env.MODE !== 'singlefile' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}
