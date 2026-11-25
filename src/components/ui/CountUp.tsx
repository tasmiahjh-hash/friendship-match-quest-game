import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../utils';

/** Animates a number from 0 to `to` with an ease-out curve. */
export function CountUp({ to, duration = 1600, delay = 0 }: { to: number; duration?: number; delay?: number }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return <>{n}</>;
}
