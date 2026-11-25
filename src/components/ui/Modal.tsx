import { useId, useRef, type ReactNode } from 'react';
import { cx } from '../../utils';
import { Portal } from './Portal';
import { useDialog } from './useDialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  tone?: 'default' | 'danger' | 'safe';
  wide?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}

export function Modal({ open, onClose, title, icon, tone = 'default', wide, children, actions }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, open, onClose);

  if (!open) return null;

  return (
    <Portal>
      <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={cx('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
          {icon && (
            <div className={cx('modal__icon', tone !== 'default' && `modal__icon--${tone}`)} aria-hidden="true">
              {icon}
            </div>
          )}
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          <div className="modal__body">{children}</div>
          {actions && <div className="modal__actions">{actions}</div>}
        </div>
      </div>
    </Portal>
  );
}
