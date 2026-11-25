import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { clearState, loadState, saveState } from '../services/storage';
import type { GameState } from '../types';
import { deriveStage, gameReducer, hydrate, type Action } from './gameLogic';
import { navigate, paths } from './router';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
  stage: ReturnType<typeof deriveStage>;
  startOver: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => hydrate(loadState()));

  const synced = useRef(false);

  useEffect(() => {
    // State that just arrived from another tab is already saved; writing it back could race that tab.
    if (synced.current) synced.current = false;
    else saveState(state);
  }, [state]);

  // Another tab (e.g. the Privacy Policy opened from the review page) must never write
  // stale answers over newer ones, so every tab follows the latest saved state.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage || e.newValue === null) return;
      synced.current = true;
      dispatch({ type: 'SYNC', saved: loadState() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      stage: deriveStage(state),
      startOver: () => {
        navigate(paths.home);
        clearState();
        dispatch({ type: 'RESET' });
      },
    }),
    [state],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
