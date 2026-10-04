import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Renders overlays at <body> so animated (transformed) ancestors can't clip `position: fixed`. */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
