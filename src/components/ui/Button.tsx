import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'magic';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', block, pulse, icon, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', pulse && 'btn--pulse', className)}
      {...rest}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
