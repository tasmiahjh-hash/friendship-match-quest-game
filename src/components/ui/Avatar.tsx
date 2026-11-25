import { cx } from '../../utils';

interface AvatarProps {
  emoji: string;
  gradient: [string, string];
  size?: number;
  ring?: boolean;
  label?: string;
  className?: string;
}

export function Avatar({ emoji, gradient, size = 48, ring, label, className }: AvatarProps) {
  return (
    <div
      className={cx('avatar', ring && 'avatar--ring', className)}
      style={{ '--size': `${size}px`, background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` } as React.CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span aria-hidden="true">{emoji}</span>
    </div>
  );
}
