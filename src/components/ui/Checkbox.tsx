import type { ReactNode } from 'react';
import { cx } from '../../utils';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}

export function Checkbox({ checked, onChange, disabled, children }: Props) {
  return (
    <label className={cx('check', checked && 'check--on')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__box" aria-hidden="true">
        ✓
      </span>
      <span>{children}</span>
    </label>
  );
}
