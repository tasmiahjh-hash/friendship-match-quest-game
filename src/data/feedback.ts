export const FEEDBACK_CATEGORIES = [
  { id: 'feature', label: 'New feature idea' },
  { id: 'matching', label: 'Matching experience' },
  { id: 'design', label: 'Website design' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'bug', label: 'Bug or technical issue' },
  { id: 'other', label: 'Other' },
] as const;

export const FEEDBACK_MIN = 5;
export const FEEDBACK_MAX = 1500;
