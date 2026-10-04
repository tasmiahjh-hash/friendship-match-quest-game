interface XPBarProps {
  progress: number; // 0..1
  label?: string;
}

export function XPBar({ progress, label = 'Experience' }: XPBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <div className="xpbar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="xpbar__fill" style={{ width: `${Math.max(pct, 3)}%` }} />
    </div>
  );
}
