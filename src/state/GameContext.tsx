import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { clearState, loadState, saveState } from '../services/storage';
import type { GameState } from '../types';
import { deriveStage, gameReducer, hydrate, type Action } from './gameLogic';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
  stage: ReturnType<typeof deriveStage>;
  resetDemo: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => hydrate(loadState()));

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      stage: deriveStage(state),
      resetDemo: () => {
        clearState();
        dispatch({ type: 'RESET' });
        window.scrollTo({ top: 0 });
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
