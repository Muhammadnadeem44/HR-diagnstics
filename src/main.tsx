import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe in-app alert & confirm handler to avoid sandbox iframe restrictions
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    window.dispatchEvent(new CustomEvent('hr-system-alert', { detail: text }));
  };
  const nativeConfirm = window.confirm?.bind(window);
  window.confirm = (message?: string) => {
    try {
      if (nativeConfirm) {
        return nativeConfirm(message);
      }
    } catch {
      // If sandboxed iframe blocks confirm prompt, proceed safely
      return true;
    }
    return true;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
