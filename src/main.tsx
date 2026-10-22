import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SettingsProvider } from './state/settings';
import { JournalProvider } from './state/journal';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <JournalProvider>
          <App />
        </JournalProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
