import { cx } from '../../utils';

interface AvatarProps {
  emoji: string;
  gradient: [string, string];
  size?: number;
  ring?: boolean;
  online?: boolean;
  label?: string;
  className?: string;
}

export function Avatar({ emoji, gradient, size = 48, ring, online, label, className }: AvatarProps) {
  return (
    <div
      className={cx('avatar', ring && 'avatar--ring', className)}
      style={{ '--size': `${size}px`, background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` } as React.CSSProperties}
      role="img"
      aria-label={label ?? 'avatar'}
    >
      <span aria-hidden="true">{emoji}</span>
      {online && <span className="avatar__status" />}
    </div>
  );
}
