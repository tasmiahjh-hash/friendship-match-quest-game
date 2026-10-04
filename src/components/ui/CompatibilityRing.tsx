import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  animate?: boolean;
  children?: React.ReactNode;
}

export function CompatibilityRing({ value, size = 200, stroke = 14, animate = true, children }: Props) {
  const [shown, setShown] = useState(animate ? 0 : value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gradId = `ring-grad-${size}`;

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setShown(value), 80);
    return () => clearTimeout(t);
  }, [value, animate]);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="50%" stopColor="#ff8a6b" />
            <stop offset="100%" stopColor="#ff7eb6" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <div className="ring__label">{children}</div>
    </div>
  );
}
