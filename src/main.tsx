import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted fonts: no request to a third-party font service.
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/plus-jakarta-sans/index.css';
import App from './App';
import { GameProvider } from './state/GameContext';
import './styles/base.css';
import './styles/ui.css';
import './styles/layout.css';
import './styles/levels.css';
import './styles/screens.css';
import './styles/pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
