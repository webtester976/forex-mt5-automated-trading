import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { API_BASE_URL, apiUrl } from './lib/api.js';

// When deployed to a standalone frontend host (e.g. Cloudflare Pages) with VITE_API_BASE_URL set,
// transparently intercept relative API fetch requests and forward them to the backend server.
if (API_BASE_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(apiUrl(input), init);
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

