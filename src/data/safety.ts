import type { ReportReason } from '../types';

export const COMMUNITY_GUIDELINES = [
  { emoji: '🎓', title: 'Students only', body: 'Friendship Quest is for verified university students. One account per person.' },
  { emoji: '💛', title: 'Be kind', body: 'Treat everyone with respect. No harassment, hate, or unwanted romantic or sexual advances.' },
  { emoji: '🙅', title: 'No pressure', body: 'Never pressure anyone to share contact details, photos, or to meet up.' },
  { emoji: '🏛️', title: 'First meetups are public', body: 'Meet for the first time at a supervised FAC event or a busy public place on campus.' },
  { emoji: '🔒', title: 'Your info is yours', body: 'Contact details are only shared if you choose to, and you can always keep chatting here.' },
  { emoji: '🚩', title: 'Speak up', body: 'If something feels off, report it. You can block or unmatch at any time, no explanation needed.' },
];

export const REPORT_REASONS: { id: ReportReason; label: string; emoji: string }[] = [
  { id: 'harassment', label: 'Harassment or bullying', emoji: '😠' },
  { id: 'inappropriate', label: 'Inappropriate or sexual content', emoji: '🚫' },
  { id: 'pressure', label: 'Pressuring me to share info or meet', emoji: '⚠️' },
  { id: 'spam', label: 'Spam, scam or fake profile', emoji: '🤖' },
  { id: 'unsafe', label: 'I feel unsafe', emoji: '🆘' },
  { id: 'other', label: 'Something else', emoji: '💭' },
];

export const MODERATION_EXPLAINER =
  'Your chats are private. Moderators don’t routinely read conversations. If you report someone, the messages you report are shared with the FAC safety team so they can review and act.';
