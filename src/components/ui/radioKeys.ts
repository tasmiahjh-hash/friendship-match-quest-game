import type { KeyboardEvent } from 'react';

/** Arrow-key movement for a role="radiogroup" container whose children are role="radio" buttons. */
export function onRadioKeys(e: KeyboardEvent<HTMLElement>) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if (!step) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
  const i = radios.indexOf(document.activeElement as HTMLElement);
  if (i === -1) return;
  e.preventDefault();
  const next = radios[(i + step + radios.length) % radios.length];
  next.focus();
  next.click();
}

/** Only one radio in a group is a Tab stop: the chosen one, or the first when none is chosen. */
export const radioTabIndex = (checked: boolean, anyChecked: boolean, index: number) => (checked || (!anyChecked && index === 0) ? 0 : -1);
