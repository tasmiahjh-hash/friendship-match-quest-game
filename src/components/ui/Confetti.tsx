import { useMemo } from 'react';
import { Portal } from './Portal';

const COLORS = ['#ff8a6b', '#ffb36b', '#ffd166', '#5ee2b5', '#a78bfa', '#ff7eb6', '#6cc6ff'];

interface ConfettiProps {
  count?: number;
  /** Change this to re-fire the burst. */
  burstKey?: string | number;
}

export function Confetti({ count = 90, burstKey }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${burstKey}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        dx: `${(Math.random() - 0.5) * 240}px`,
        rot: `${(Math.random() - 0.5) * 1080}deg`,
        color: COLORS[i % COLORS.length],
        round: Math.random() > 0.7,
      })),
    [count, burstKey],
  );

  return (
    <Portal>
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              borderRadius: p.round ? '50%' : undefined,
              '--dx': p.dx,
              '--rot': p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
    </Portal>
  );
}
