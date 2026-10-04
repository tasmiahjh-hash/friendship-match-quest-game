import type { ReactNode } from 'react';
import { cx } from '../../utils';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export function Checkbox({ checked, onChange, children }: Props) {
  return (
    <label className={cx('check', checked && 'check--on')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check__box" aria-hidden="true">
        ✓
      </span>
      <span>{children}</span>
    </label>
  );
}
