import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../../utils';
import { Portal } from './Portal';

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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {icon && <div className={cx('modal__icon', tone !== 'default' && `modal__icon--${tone}`)}>{icon}</div>}
        <h2 className="modal__title">{title}</h2>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
    </Portal>
  );
}
