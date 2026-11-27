import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker on HTTP(S)/localhost for Android, Huawei & iOS PWA install/offline support
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  (window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {
      // Ignore registration failure in restricted iframe or preview contexts
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
